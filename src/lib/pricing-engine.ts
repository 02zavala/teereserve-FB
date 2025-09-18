import { 
  Season, 
  TimeBand, 
  PriceRule, 
  SpecialOverride, 
  BaseProduct, 
  PriceCache,
  PriceCalculationResult,
  PriceCalculationInput,
  PriceRuleType
} from '@/types';
import { format, parseISO, isWithinInterval, getDay } from 'date-fns';

/**
 * Motor de cálculo de precios jerárquico
 * 
 * Orden de aplicación (de mayor a menor prioridad):
 * 1. Overrides especiales (feriados, torneos, cierre parcial)
 * 2. Temporada (alta/baja: fechas)
 * 3. Día de la semana (lun-dom)
 * 4. Banda horaria (Early, Prime, Twilight)
 * 5. Lead time (anticipación de compra)
 * 6. Ocupación (yield: % de cupos ya vendidos)
 * 7. Jugadores (precio por pax o bundle 2/3/4)
 * 8. Promos/descuentos (códigos, residente, afiliado)
 * 9. Redondeo (al múltiplo de $5/$10) y mín/máx por regla
 */
export class PricingEngine {
  private seasons: Map<string, Season[]> = new Map();
  private timeBands: Map<string, TimeBand[]> = new Map();
  private priceRules: Map<string, PriceRule[]> = new Map();
  private specialOverrides: SpecialOverride[] = [];
  private baseProducts: Map<string, BaseProduct> = new Map();
  private priceCache: Map<string, PriceCache> = new Map();
  private authToken: string | null = null;

  constructor() {
    // En producción, estos datos vendrían de la base de datos
    this.initializeDefaultData();
  }

  // Set authentication token for API calls
  setAuthToken(token: string) {
    this.authToken = token;
  }

  private generateId(): string {
    return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now();
  }

  /**
   * Calcula el precio para un tee time específico
   */
  async calculatePrice(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const { courseId, date, time, players } = input;
    const dateObj = parseISO(date);
    const dow = getDay(dateObj); // 0=domingo, 6=sábado
    
    // Calcular lead time si no se proporciona
    const leadTimeHours = input.leadTimeHours || this.calculateLeadTime(date, time);
    const occupancyPercent = input.occupancyPercent || 0;

    // 1. Verificar overrides especiales (máxima prioridad)
    const specialOverride = this.findSpecialOverride(courseId, date, time);
    if (specialOverride) {
      if (specialOverride.overrideType === 'block') {
        throw new Error('Tee time bloqueado por override especial');
      }
      if (specialOverride.overrideType === 'price' && specialOverride.priceValue) {
        return {
          basePrice: specialOverride.priceValue,
          appliedRules: [{
            ruleId: specialOverride.id,
            ruleName: specialOverride.name,
            ruleType: 'fixed',
            value: specialOverride.priceValue,
            resultPrice: specialOverride.priceValue
          }],
          finalPricePerPlayer: specialOverride.priceValue,
          totalPrice: specialOverride.priceValue * players,
          players,
          calculationTimestamp: new Date().toISOString()
        };
      }
    }

    // 2. Obtener precio base del producto
    const baseProduct = this.baseProducts.get(courseId);
    if (!baseProduct) {
      throw new Error(`Producto base no encontrado para el curso ${courseId}`);
    }

    let currentPrice = baseProduct.greenFeeBaseUsd;
    const appliedRules: PriceCalculationResult['appliedRules'] = [];

    // 3. Aplicar reglas en orden de prioridad
    const applicableRules = this.getApplicableRules(courseId, dateObj, time, dow, leadTimeHours, occupancyPercent, players);
    
    for (const rule of applicableRules) {
      const previousPrice = currentPrice;
      
      switch (rule.priceType) {
        case 'fixed':
          currentPrice = rule.priceValue;
          break;
        case 'delta':
          currentPrice += rule.priceValue;
          break;
        case 'multiplier':
          currentPrice *= rule.priceValue;
          break;
      }

      // Aplicar límites si están definidos
      if (rule.minPrice && currentPrice < rule.minPrice) {
        currentPrice = rule.minPrice;
      }
      if (rule.maxPrice && currentPrice > rule.maxPrice) {
        currentPrice = rule.maxPrice;
      }

      // Aplicar redondeo si está definido
      if (rule.roundTo) {
        currentPrice = Math.round(currentPrice / rule.roundTo) * rule.roundTo;
      }

      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.priceType,
        value: rule.priceValue,
        resultPrice: currentPrice
      });
    }

    // Redondeo final por defecto a múltiplo de 5
    const finalPrice = Math.round(currentPrice / 5) * 5;

    return {
      basePrice: baseProduct.greenFeeBaseUsd,
      appliedRules,
      finalPricePerPlayer: finalPrice,
      totalPrice: finalPrice * players,
      players,
      calculationTimestamp: new Date().toISOString()
    };
  }

  /**
   * Encuentra override especial aplicable
   */
  private findSpecialOverride(courseId: string, date: string, time: string): SpecialOverride | null {
    const dateObj = parseISO(date);
    
    return this.specialOverrides
      .filter(override => 
        override.courseId === courseId &&
        override.active &&
        isWithinInterval(dateObj, {
          start: parseISO(override.startDate),
          end: parseISO(override.endDate)
        }) &&
        this.isTimeInRange(time, override.startTime, override.endTime)
      )
      .sort((a, b) => b.priority - a.priority)[0] || null;
  }

  /**
   * Obtiene reglas aplicables ordenadas por prioridad
   */
  private getApplicableRules(
    courseId: string, 
    date: Date, 
    time: string, 
    dow: number, 
    leadTimeHours: number, 
    occupancyPercent: number, 
    players: number
  ): PriceRule[] {
    const timeBand = this.findTimeBand(courseId, time);
    const season = this.findSeason(courseId, date);
    const now = new Date();
    const coursePriceRules = this.priceRules.get(courseId) || [];

    return coursePriceRules
      .filter(rule => {
        // Filtros básicos
        if (!rule.active) return false;
        
        // Verificar fechas de efectividad
        if (rule.effectiveFrom && parseISO(rule.effectiveFrom) > now) return false;
        if (rule.effectiveTo && parseISO(rule.effectiveTo) < now) return false;
        
        // Filtros específicos
        if (rule.seasonId && rule.seasonId !== season?.id) return false;
        if (rule.dow && !rule.dow.includes(dow)) return false;
        if (rule.timeBandId && rule.timeBandId !== timeBand?.id) return false;
        if (rule.leadTimeMin && leadTimeHours < rule.leadTimeMin) return false;
        if (rule.leadTimeMax && leadTimeHours > rule.leadTimeMax) return false;
        if (rule.occupancyMin && occupancyPercent < rule.occupancyMin) return false;
        if (rule.occupancyMax && occupancyPercent > rule.occupancyMax) return false;
        if (rule.playersMin && players < rule.playersMin) return false;
        if (rule.playersMax && players > rule.playersMax) return false;
        
        return true;
      })
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Encuentra la temporada aplicable
   */
  private findSeason(courseId: string, date: Date): Season | null {
    const courseSeasons = this.seasons.get(courseId) || [];
    return courseSeasons
      .filter(season => 
        season.active &&
        isWithinInterval(date, {
          start: parseISO(season.startDate),
          end: parseISO(season.endDate)
        })
      )
      .sort((a, b) => b.priority - a.priority)[0] || null;
  }

  /**
   * Encuentra la banda horaria aplicable
   */
  private findTimeBand(courseId: string, time: string): TimeBand | null {
    const courseTimeBands = this.timeBands.get(courseId) || [];
    return courseTimeBands
      .filter(band => 
        band.active &&
        this.isTimeInRange(time, band.startTime, band.endTime)
      )[0] || null;
  }

  /**
   * Verifica si un tiempo está dentro de un rango
   */
  private isTimeInRange(time: string, startTime?: string, endTime?: string): boolean {
    if (!startTime || !endTime) return true;
    
    const timeMinutes = this.timeToMinutes(time);
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
  }

  /**
   * Convierte tiempo HH:mm a minutos
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Calcula lead time en horas
   */
  private calculateLeadTime(date: string, time: string): number {
    const teeDateTime = parseISO(`${date}T${time}:00`);
    const now = new Date();
    return (teeDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  }

  /**
   * Inicializa datos por defecto (en producción vendrían de la DB)
   */
  private initializeDefaultData(): void {
    // Ejemplo para Los Cabos (octubre-noviembre alta temporada)
    const courseId = 'palmilla-golf-club';
    
    // Temporadas
    this.seasons.set(courseId, [
      {
        id: 'alta-oct-nov-2025',
        courseId,
        name: 'Alta Temporada Oct-Nov',
        startDate: '2025-10-01',
        endDate: '2025-11-30',
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'media-sep-2025',
        courseId,
        name: 'Temporada Media Sep',
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        priority: 70,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Bandas horarias
    this.timeBands.set(courseId, [
      {
        id: 'early-band',
        courseId,
        label: 'Early',
        startTime: '07:00',
        endTime: '09:00',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prime-band',
        courseId,
        label: 'Prime',
        startTime: '09:12',
        endTime: '12:00',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'twilight-band',
        courseId,
        label: 'Twilight',
        startTime: '15:00',
        endTime: '18:00',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Reglas de precios
    this.priceRules.set(courseId, [
      {
        id: 'rack-alta-temporada',
        courseId,
        name: 'Rack Temporada Alta',
        seasonId: 'alta-oct-nov-2025',
        priceType: 'fixed',
        priceValue: 120,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'weekend-premium',
        courseId,
        name: 'Premium Fin de Semana',
        dow: [0, 6], // Domingo y Sábado
        priceType: 'delta',
        priceValue: 150,
        priority: 80,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'prime-multiplier',
        courseId,
        name: 'Multiplicador Prime',
        timeBandId: 'prime-band',
        priceType: 'multiplier',
        priceValue: 1.10,
        priority: 70,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'twilight-discount',
        courseId,
        name: 'Descuento Twilight',
        timeBandId: 'twilight-band',
        priceType: 'multiplier',
        priceValue: 0.85,
        priority: 70,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'early-bird-discount',
        courseId,
        name: 'Descuento Early Bird',
        leadTimeMin: 720, // 30 días
        priceType: 'multiplier',
        priceValue: 0.90,
        priority: 60,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'high-occupancy-premium',
        courseId,
        name: 'Premium Alta Ocupación',
        occupancyMin: 70,
        priceType: 'multiplier',
        priceValue: 1.05,
        priority: 65,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'foursome-bundle',
        courseId,
        name: 'Bundle 4 Jugadores',
        playersMin: 4,
        playersMax: 4,
        priceType: 'delta',
        priceValue: -50,
        priority: 50,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Producto base
    this.baseProducts.set(courseId, {
      id: 'base-palmilla',
      courseId,
      greenFeeBaseUsd: 95, // Precio base en USD
      cartFeeUsd: 300,
      caddieFeeUsd: 500,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Métodos para gestión de datos (CRUD)
   */
  
  // Seasons
  addSeason(season: Omit<Season, 'id' | 'createdAt'>): Season {
    const newSeason: Season = {
      ...season,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    const courseSeasons = this.seasons.get(season.courseId) || [];
    courseSeasons.push(newSeason);
    this.seasons.set(season.courseId, courseSeasons);
    this.invalidateCache(season.courseId);
    return newSeason;
  }

  updateSeason(id: string, updates: Partial<Season>): Season | null {
    for (const [courseId, seasons] of this.seasons.entries()) {
      const index = seasons.findIndex(s => s.id === id);
      if (index !== -1) {
        seasons[index] = { ...seasons[index], ...updates, updatedAt: new Date().toISOString() };
        this.invalidateCache(courseId);
        return seasons[index];
      }
    }
    return null;
  }

  deleteSeason(id: string): boolean {
    for (const [courseId, seasons] of this.seasons.entries()) {
      const index = seasons.findIndex(s => s.id === id);
      if (index !== -1) {
        seasons.splice(index, 1);
        this.invalidateCache(courseId);
        return true;
      }
    }
    return false;
  }

  // Time Bands
  addTimeBand(timeBand: Omit<TimeBand, 'id' | 'createdAt'>): TimeBand {
    const newTimeBand: TimeBand = {
      ...timeBand,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    const courseTimeBands = this.timeBands.get(timeBand.courseId) || [];
    courseTimeBands.push(newTimeBand);
    this.timeBands.set(timeBand.courseId, courseTimeBands);
    this.invalidateCache(timeBand.courseId);
    return newTimeBand;
  }

  updateTimeBand(id: string, updates: Partial<TimeBand>): TimeBand | null {
    for (const [courseId, timeBands] of this.timeBands.entries()) {
      const index = timeBands.findIndex(t => t.id === id);
      if (index !== -1) {
        timeBands[index] = { ...timeBands[index], ...updates, updatedAt: new Date().toISOString() };
        this.invalidateCache(courseId);
        return timeBands[index];
      }
    }
    return null;
  }

  deleteTimeBand(id: string): boolean {
    for (const [courseId, timeBands] of this.timeBands.entries()) {
      const index = timeBands.findIndex(t => t.id === id);
      if (index !== -1) {
        timeBands.splice(index, 1);
        this.invalidateCache(courseId);
        return true;
      }
    }
    return false;
  }

  // Price Rules
  addPriceRule(rule: Omit<PriceRule, 'id' | 'createdAt'>): PriceRule {
    const newRule: PriceRule = {
      ...rule,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    
    const coursePriceRules = this.priceRules.get(rule.courseId) || [];
    coursePriceRules.push(newRule);
    this.priceRules.set(rule.courseId, coursePriceRules);
    this.invalidateCache(rule.courseId);
    return newRule;
  }

  updatePriceRule(id: string, updates: Partial<PriceRule>): PriceRule | null {
    for (const [courseId, priceRules] of this.priceRules.entries()) {
      const index = priceRules.findIndex(r => r.id === id);
      if (index !== -1) {
        priceRules[index] = { ...priceRules[index], ...updates, updatedAt: new Date().toISOString() };
        this.invalidateCache(courseId);
        return priceRules[index];
      }
    }
    return null;
  }

  deletePriceRule(id: string): boolean {
    for (const [courseId, priceRules] of this.priceRules.entries()) {
      const index = priceRules.findIndex(r => r.id === id);
      if (index !== -1) {
        priceRules.splice(index, 1);
        this.invalidateCache(courseId);
        return true;
      }
    }
    return false;
  }

  // Cache management
  private invalidateCache(courseId: string): void {
    const keysToDelete = Array.from(this.priceCache.keys())
      .filter(key => key.includes(courseId));
    
    keysToDelete.forEach(key => this.priceCache.delete(key));
  }

  // Special Overrides
  addSpecialOverride(override: Omit<SpecialOverride, 'id' | 'createdAt'>): SpecialOverride {
    const newOverride: SpecialOverride = {
      ...override,
      id: this.generateId(),
      createdAt: new Date().toISOString()
    };
    this.specialOverrides.push(newOverride);
    this.invalidateCache(override.courseId);
    return newOverride;
  }

  updateSpecialOverride(id: string, updates: Partial<SpecialOverride>): SpecialOverride | null {
    const index = this.specialOverrides.findIndex(o => o.id === id);
    if (index === -1) return null;
    
    this.specialOverrides[index] = { ...this.specialOverrides[index], ...updates, updatedAt: new Date().toISOString() };
    this.invalidateCache(this.specialOverrides[index].courseId);
    return this.specialOverrides[index];
  }

  deleteSpecialOverride(id: string): boolean {
    const index = this.specialOverrides.findIndex(o => o.id === id);
    if (index === -1) return false;
    
    const courseId = this.specialOverrides[index].courseId;
    this.specialOverrides.splice(index, 1);
    this.invalidateCache(courseId);
    return true;
  }

  // Base Products
  updateBaseProduct(courseId: string, updates: Partial<BaseProduct>): BaseProduct {
    const existing = this.baseProducts.get(courseId);
    const updated: BaseProduct = {
      greenFeeBaseUsd: 0, // Default value
      ...existing,
      ...updates,
      id: existing?.id || this.generateId(),
      courseId,
      updatedAt: new Date().toISOString()
    };
    this.baseProducts.set(courseId, updated);
    this.invalidateCache(courseId);
    return updated;
  }

  // Bulk Operations
  duplicateRulesForDateRange(courseId: string, sourceStartDate: string, sourceEndDate: string, targetStartDate: string, targetEndDate: string): PriceRule[] {
    const sourcePriceRules = this.priceRules.get(courseId) || [];
    const rulesToDuplicate = sourcePriceRules.filter(rule => {
      if (!rule.effectiveFrom || !rule.effectiveTo) return false;
      return rule.effectiveFrom >= sourceStartDate && rule.effectiveTo <= sourceEndDate;
    });

    const newRules: PriceRule[] = [];
    rulesToDuplicate.forEach(rule => {
      const newRule: PriceRule = {
        ...rule,
        id: this.generateId(),
        name: `${rule.name} (Duplicated)`,
        effectiveFrom: targetStartDate,
        effectiveTo: targetEndDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newRules.push(newRule);
    });

    const coursePriceRules = this.priceRules.get(courseId) || [];
    coursePriceRules.push(...newRules);
    this.priceRules.set(courseId, coursePriceRules);
    this.invalidateCache(courseId);
    return newRules;
  }

  applyBulkPriceChange(courseId: string, filters: {
    seasonId?: string;
    timeBandId?: string;
    dow?: number[];
  }, change: {
    type: 'percentage' | 'fixed';
    value: number;
  }): PriceRule[] {
    const coursePriceRules = this.priceRules.get(courseId) || [];
    const updatedRules: PriceRule[] = [];

    coursePriceRules.forEach(rule => {
      let shouldUpdate = true;
      
      if (filters.seasonId && rule.seasonId !== filters.seasonId) shouldUpdate = false;
      if (filters.timeBandId && rule.timeBandId !== filters.timeBandId) shouldUpdate = false;
      if (filters.dow && rule.dow && !rule.dow.some(d => filters.dow!.includes(d))) shouldUpdate = false;

      if (shouldUpdate && rule.priceType !== 'multiplier') {
        const newValue = change.type === 'percentage' 
          ? rule.priceValue * (1 + change.value / 100)
          : rule.priceValue + change.value;
        
        rule.priceValue = Math.round(newValue);
        rule.updatedAt = new Date().toISOString();
        updatedRules.push(rule);
      }
    });

    this.invalidateCache(courseId);
    return updatedRules;
  }

  // Price Calculation with Cache
  async calculatePriceWithCache(input: PriceCalculationInput): Promise<PriceCalculationResult> {
    const cacheKey = `${input.courseId}-${input.date}-${input.time}-${input.players}-${input.leadTimeHours || 0}`;
    
    // Check cache first
    const cached = this.priceCache.get(cacheKey);
    if (cached && new Date(cached.expiresAt) > new Date()) {
      return {
        basePrice: cached.pricePerPlayer,
        appliedRules: cached.appliedRules || [],
        finalPricePerPlayer: cached.pricePerPlayer,
        totalPrice: cached.totalPrice,
        players: input.players,
        calculationTimestamp: cached.calculatedAt
      };
    }

    // Calculate fresh price
    const result = await this.calculatePrice(input);
    
    // Cache the result for 10 minutes
    this.priceCache.set(cacheKey, {
      id: this.generateId(),
      courseId: input.courseId,
      date: input.date,
      timeBand: input.time,
      pricePerPlayer: result.finalPricePerPlayer,
      totalPrice: result.totalPrice,
      appliedRules: result.appliedRules,
      calculatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
    });

    return result;
  }

  // Pre-calculate prices for calendar view
  async preCalculatePricesForMonth(courseId: string, year: number, month: number): Promise<Map<string, PriceCache>> {
    const results = new Map<string, PriceCache>();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const timeBands = this.getTimeBands(courseId);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day).toISOString().split('T')[0];
      
      for (const timeBand of timeBands) {
        const input: PriceCalculationInput = {
          courseId,
          date,
          time: timeBand.startTime,
          players: 4, // Default to 4 players for calendar view
          leadTimeHours: 24 // Default lead time
        };

        try {
          const result = await this.calculatePrice(input);
          const cacheKey = `${courseId}-${date}-${timeBand.id}`;
          
          results.set(cacheKey, {
            id: this.generateId(),
            courseId,
            date,
            timeBand: timeBand.id,
            pricePerPlayer: result.finalPricePerPlayer,
            totalPrice: result.totalPrice,
            appliedRules: result.appliedRules,
            calculatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          });
        } catch (error) {
          // Skip blocked dates or calculation errors
          continue;
        }
      }
    }

    return results;
  }

  // Getters para UI
  getSeasons(courseId: string): Season[] {
    return this.seasons.get(courseId) || [];
  }

  getTimeBands(courseId: string): TimeBand[] {
    return this.timeBands.get(courseId) || [];
  }

  getPriceRules(courseId: string): PriceRule[] {
    return this.priceRules.get(courseId) || [];
  }

  getSpecialOverrides(courseId: string): SpecialOverride[] {
    return this.specialOverrides.filter(o => o.courseId === courseId);
  }

  getBaseProduct(courseId: string): BaseProduct | null {
    return this.baseProducts.get(courseId) || null;
  }

  // Export/Import for backup
  exportPricingData(courseId: string) {
    return {
      seasons: this.getSeasons(courseId),
      timeBands: this.getTimeBands(courseId),
      priceRules: this.getPriceRules(courseId),
      specialOverrides: this.getSpecialOverrides(courseId),
      baseProduct: this.getBaseProduct(courseId)
    };
  }

  importPricingData(courseId: string, data: {
    seasons?: Season[];
    timeBands?: TimeBand[];
    priceRules?: PriceRule[];
    specialOverrides?: SpecialOverride[];
    baseProduct?: BaseProduct;
  }) {
    if (data.seasons) this.seasons.set(courseId, data.seasons);
    if (data.timeBands) this.timeBands.set(courseId, data.timeBands);
    if (data.priceRules) this.priceRules.set(courseId, data.priceRules);
    if (data.specialOverrides) {
      // Remove existing overrides for this course
      this.specialOverrides = this.specialOverrides.filter(o => o.courseId !== courseId);
      this.specialOverrides.push(...data.specialOverrides);
    }
    if (data.baseProduct) this.baseProducts.set(courseId, data.baseProduct);
    
    this.invalidateCache(courseId);
  }

  /**
   * Calcula el precio mínimo para un campo específico
   * basado en todas las reglas de precios configuradas
   */
  getMinimumPrice(courseId: string): number {
    const priceRules = this.priceRules.get(courseId) || [];
    const baseProduct = this.baseProducts.get(courseId);
    const basePrice = baseProduct?.greenFeeBaseMxn || 295;
    
    if (priceRules.length === 0) {
      return basePrice;
    }

    // Encontrar el precio mínimo entre todas las reglas
    let minPrice = basePrice;
    
    for (const rule of priceRules) {
      let calculatedPrice = basePrice;
      
      if (rule.priceType === 'fixed') {
        calculatedPrice = rule.priceValue;
      } else if (rule.priceType === 'delta') {
        calculatedPrice = basePrice + rule.priceValue;
      } else if (rule.priceType === 'multiplier') {
        calculatedPrice = basePrice * rule.priceValue;
      }
      
      if (calculatedPrice < minPrice) {
        minPrice = calculatedPrice;
      }
    }

    return Math.max(minPrice, 0); // Asegurar que no sea negativo
  }

  // Persistence methods
  async loadPricingData(courseId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('No auth token set for pricing engine');
      return false;
    }

    try {
      const response = await fetch(`/api/admin/pricing/load?courseId=${courseId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Failed to load pricing data:', response.statusText);
        return false;
      }

      const result = await response.json();
      if (!result.ok) {
        console.error('API error loading pricing data:', result.error);
        return false;
      }

      const { seasons, timeBands, priceRules, specialOverrides, baseProduct } = result.data;

      // Load data into memory
      if (seasons && seasons.length > 0) {
        this.seasons.set(courseId, seasons);
      }
      
      if (timeBands && timeBands.length > 0) {
        this.timeBands.set(courseId, timeBands);
      }
      
      if (priceRules && priceRules.length > 0) {
        this.priceRules.set(courseId, priceRules);
      }
      
      if (specialOverrides && specialOverrides.length > 0) {
        // Filter overrides for this course and merge with existing
        const courseOverrides = specialOverrides.filter((o: any) => o.courseId === courseId);
        const otherOverrides = this.specialOverrides.filter(o => o.courseId !== courseId);
        this.specialOverrides = [...otherOverrides, ...courseOverrides];
      }
      
      if (baseProduct) {
        this.baseProducts.set(courseId, baseProduct);
      }

      // Invalidate cache for this course
      this.invalidateCache(courseId);
      
      console.log(`Pricing data loaded successfully for course: ${courseId}`);
      return true;
      
    } catch (error) {
      console.error('Error loading pricing data:', error);
      return false;
    }
  }

  async savePricingData(courseId: string): Promise<boolean> {
    if (!this.authToken) {
      console.warn('No auth token set for pricing engine');
      return false;
    }

    try {
      const pricingData = {
        courseId,
        seasons: this.getSeasons(courseId),
        timeBands: this.getTimeBands(courseId),
        priceRules: this.getPriceRules(courseId),
        specialOverrides: this.getSpecialOverrides(courseId),
        baseProduct: this.getBaseProduct(courseId)
      };

      const response = await fetch('/api/admin/pricing/save', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pricingData)
      });

      if (!response.ok) {
        console.error('Failed to save pricing data:', response.statusText);
        return false;
      }

      const result = await response.json();
      if (!result.ok) {
        console.error('API error saving pricing data:', result.error);
        return false;
      }

      console.log(`Pricing data saved successfully for course: ${courseId}`);
      return true;
      
    } catch (error) {
      console.error('Error saving pricing data:', error);
      return false;
    }
  }

  // Auto-save wrapper methods that persist changes
  async addSeasonWithPersistence(season: Omit<Season, 'id' | 'createdAt'>): Promise<Season> {
    const newSeason = this.addSeason(season);
    await this.savePricingData(season.courseId);
    return newSeason;
  }

  async updateSeasonWithPersistence(id: string, updates: Partial<Season>): Promise<Season | null> {
    const updated = this.updateSeason(id, updates);
    if (updated) {
      await this.savePricingData(updated.courseId);
    }
    return updated;
  }

  async addTimeBandWithPersistence(timeBand: Omit<TimeBand, 'id' | 'createdAt'>): Promise<TimeBand> {
    const newTimeBand = this.addTimeBand(timeBand);
    await this.savePricingData(timeBand.courseId);
    return newTimeBand;
  }

  async updateTimeBandWithPersistence(id: string, updates: Partial<TimeBand>): Promise<TimeBand | null> {
    const updated = this.updateTimeBand(id, updates);
    if (updated) {
      // Find courseId from the updated timeBand
      for (const [courseId, timeBands] of this.timeBands.entries()) {
        if (timeBands.find(t => t.id === id)) {
          await this.savePricingData(courseId);
          break;
        }
      }
    }
    return updated;
  }

  async addPriceRuleWithPersistence(priceRule: Omit<PriceRule, 'id' | 'createdAt'>): Promise<PriceRule> {
    const newPriceRule = this.addPriceRule(priceRule);
    await this.savePricingData(priceRule.courseId);
    return newPriceRule;
  }

  async updatePriceRuleWithPersistence(id: string, updates: Partial<PriceRule>): Promise<PriceRule | null> {
    const updated = this.updatePriceRule(id, updates);
    if (updated) {
      // Find courseId from the updated priceRule
      for (const [courseId, priceRules] of this.priceRules.entries()) {
        if (priceRules.find(r => r.id === id)) {
          await this.savePricingData(courseId);
          break;
        }
      }
    }
    return updated;
  }

  async updateBaseProductWithPersistence(courseId: string, updates: Partial<BaseProduct>): Promise<BaseProduct> {
    const updated = this.updateBaseProduct(courseId, updates);
    await this.savePricingData(courseId);
    return updated;
  }
}

// Instancia singleton
export const pricingEngine = new PricingEngine();