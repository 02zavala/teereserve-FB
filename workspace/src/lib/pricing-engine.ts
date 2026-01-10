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
 * Motor de cálculo de precios estáticos
 * 
 * Orden de aplicación (de mayor a menor prioridad):
 * 1. Overrides especiales (feriados, torneos, cierre parcial)
 * 2. Temporada (alta/baja: fechas)
 * 3. Día de la semana (lun-dom)
 * 4. Banda horaria (Early, Prime, Twilight)
 * 5. Reglas manuales estáticas
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

    // Usar precio exacto sin redondeo por defecto
    const finalPrice = currentPrice;

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
        
        // Filtros específicos (Solo estáticos: Temporada, Día de semana, Banda horaria)
        if (rule.seasonId && rule.seasonId !== season?.id) return false;
        if (rule.dow && !rule.dow.includes(dow)) return false;
        if (rule.timeBandId && rule.timeBandId !== timeBand?.id) return false;
        
        // Ignorar filtros dinámicos (Lead time, Ocupación, Jugadores) para forzar precios estáticos
        
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

    // Defaults for Riviera Cancún
    const rivieraId = 'riviera-cancun-golf-resort';
    this.baseProducts.set(rivieraId, {
      id: 'base-riviera',
      courseId: rivieraId,
      greenFeeBaseUsd: 180,
      updatedAt: new Date().toISOString()
    });

    // Bandas horarias específicas para Riviera Cancún
    this.timeBands.set(rivieraId, [
      {
        id: 'riviera-early-band',
        courseId: rivieraId,
        label: 'Early',
        startTime: '07:00',
        endTime: '09:00',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'riviera-prime-band',
        courseId: rivieraId,
        label: 'Prime',
        startTime: '09:12',
        endTime: '12:00',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'riviera-twilight-band',
        courseId: rivieraId,
        label: 'Twilight',
        startTime: '15:00',
        endTime: '18:00',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Reglas por banda: fijamos el precio cargado (180 USD) directamente por banda
    this.priceRules.set(rivieraId, [
      {
        id: 'riviera-precios-early',
        courseId: rivieraId,
        name: 'PRECIOS Early',
        description: 'Precio fijo base por banda',
        timeBandId: 'riviera-early-band',
        priceType: 'fixed',
        priceValue: 180,
        priority: 80,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'riviera-precios-prime',
        courseId: rivieraId,
        name: 'PRECIOS Prime',
        description: 'Precio fijo base por banda',
        timeBandId: 'riviera-prime-band',
        priceType: 'fixed',
        priceValue: 180,
        priority: 80,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'riviera-precios-twilight',
        courseId: rivieraId,
        name: 'PRECIOS Twilight',
        description: 'Precio fijo base por banda',
        timeBandId: 'riviera-twilight-band',
        priceType: 'fixed',
        priceValue: 180,
        priority: 80,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // ====== Precios exactos para cursos solicitados (Nov 1, 2025 – May 15, 2026) ======
    // Cabo Real
    const caboRealId = 'cabo-real-golf-club';
    this.baseProducts.set(caboRealId, {
      id: 'base-cabo-real',
      courseId: caboRealId,
      greenFeeBaseUsd: 295,
      updatedAt: new Date().toISOString()
    });
    this.seasons.set(caboRealId, [
      {
        id: 'alta-nov2025-may2026',
        courseId: caboRealId,
        name: 'Alta Nov 2025 – May 2026',
        startDate: '2025-11-01',
        endDate: '2026-05-15',
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.timeBands.set(caboRealId, [
      {
        id: 'cabo-real-morning',
        courseId: caboRealId,
        label: '07:00–11:50',
        startTime: '07:00',
        endTime: '11:50',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cabo-real-mid',
        courseId: caboRealId,
        label: '12:00–13:20',
        startTime: '12:00',
        endTime: '13:20',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cabo-real-afternoon',
        courseId: caboRealId,
        label: '13:30–18:00',
        startTime: '13:30',
        endTime: '18:00',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.priceRules.set(caboRealId, [
      {
        id: 'cabo-real-morning-price',
        courseId: caboRealId,
        name: 'Morning Fixed',
        description: '7:00–11:50',
        seasonId: 'alta-nov2025-may2026',
        timeBandId: 'cabo-real-morning',
        priceType: 'fixed',
        priceValue: 295,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cabo-real-mid-price',
        courseId: caboRealId,
        name: 'Midday Fixed',
        description: '12:00–13:20',
        seasonId: 'alta-nov2025-may2026',
        timeBandId: 'cabo-real-mid',
        priceType: 'fixed',
        priceValue: 295,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'cabo-real-afternoon-price',
        courseId: caboRealId,
        name: 'Afternoon Fixed',
        description: '13:30–close',
        seasonId: 'alta-nov2025-may2026',
        timeBandId: 'cabo-real-afternoon',
        priceType: 'fixed',
        priceValue: 295,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Club Campestre San José
    const campestreId = 'club-campestre-san-jose';
    this.baseProducts.set(campestreId, {
      id: 'base-campestre',
      courseId: campestreId,
      greenFeeBaseUsd: 220,
      updatedAt: new Date().toISOString()
    });
    this.seasons.set(campestreId, [
      {
        id: 'campestre-alta-nov2025-may2026',
        courseId: campestreId,
        name: 'Alta Nov 2025 – May 2026',
        startDate: '2025-11-01',
        endDate: '2026-05-15',
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.timeBands.set(campestreId, [
      {
        id: 'campestre-morning',
        courseId: campestreId,
        label: '07:30–11:50',
        startTime: '07:30',
        endTime: '11:50',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'campestre-mid',
        courseId: campestreId,
        label: '12:00–13:20',
        startTime: '12:00',
        endTime: '13:20',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'campestre-afternoon',
        courseId: campestreId,
        label: '13:30–17:30',
        startTime: '13:30',
        endTime: '17:30',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.priceRules.set(campestreId, [
      {
        id: 'campestre-morning-price',
        courseId: campestreId,
        name: 'Morning Fixed',
        description: '7:30–11:50',
        seasonId: 'campestre-alta-nov2025-may2026',
        timeBandId: 'campestre-morning',
        priceType: 'fixed',
        priceValue: 260,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'campestre-mid-price',
        courseId: campestreId,
        name: 'Midday Fixed',
        description: '12:00–13:20',
        seasonId: 'campestre-alta-nov2025-may2026',
        timeBandId: 'campestre-mid',
        priceType: 'fixed',
        priceValue: 220,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'campestre-afternoon-price',
        courseId: campestreId,
        name: 'Afternoon Fixed',
        description: '13:30–close',
        seasonId: 'campestre-alta-nov2025-may2026',
        timeBandId: 'campestre-afternoon',
        priceType: 'fixed',
        priceValue: 195,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);

    // Puerto Los Cabos
    const puertoId = 'puerto-los-cabos';
    this.baseProducts.set(puertoId, {
      id: 'base-puerto',
      courseId: puertoId,
      greenFeeBaseUsd: 395,
      updatedAt: new Date().toISOString()
    });
    this.seasons.set(puertoId, [
      {
        id: 'puerto-alta-nov2025-may2026',
        courseId: puertoId,
        name: 'Alta Nov 2025 – May 2026',
        startDate: '2025-11-01',
        endDate: '2026-05-15',
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.timeBands.set(puertoId, [
      {
        id: 'puerto-morning',
        courseId: puertoId,
        label: '07:00–11:50',
        startTime: '07:00',
        endTime: '11:50',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'puerto-mid',
        courseId: puertoId,
        label: '12:00–13:20',
        startTime: '12:00',
        endTime: '13:20',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'puerto-afternoon',
        courseId: puertoId,
        label: '13:30–19:00',
        startTime: '13:30',
        endTime: '19:00',
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
    this.priceRules.set(puertoId, [
      {
        id: 'puerto-morning-price',
        courseId: puertoId,
        name: 'Morning Fixed',
        description: '7:00–11:50',
        seasonId: 'puerto-alta-nov2025-may2026',
        timeBandId: 'puerto-morning',
        priceType: 'fixed',
        priceValue: 395,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'puerto-mid-price',
        courseId: puertoId,
        name: 'Midday Fixed',
        description: '12:00–13:20',
        seasonId: 'puerto-alta-nov2025-may2026',
        timeBandId: 'puerto-mid',
        priceType: 'fixed',
        priceValue: 320,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'puerto-afternoon-price',
        courseId: puertoId,
        name: 'Afternoon Fixed',
        description: '13:30–close',
        seasonId: 'puerto-alta-nov2025-may2026',
        timeBandId: 'puerto-afternoon',
        priceType: 'fixed',
        priceValue: 295,
        priority: 90,
        active: true,
        createdAt: new Date().toISOString()
      }
    ]);
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
    // Sobrescribir siempre con los datos proporcionados (incluso si son arrays vacíos)
    // para garantizar consistencia con la base de datos y evitar usar defaults antiguos.
    if (data.seasons) {
      this.seasons.set(courseId, data.seasons);
    }
    if (data.timeBands) {
      this.timeBands.set(courseId, data.timeBands);
    }
    if (data.priceRules) {
      this.priceRules.set(courseId, data.priceRules);
    }
    if (data.specialOverrides) {
      // Remove existing overrides for this course
      this.specialOverrides = this.specialOverrides.filter(o => o.courseId !== courseId);
      this.specialOverrides.push(...data.specialOverrides);
    }
    if (data.baseProduct) {
      this.baseProducts.set(courseId, data.baseProduct);
    }
    
    this.invalidateCache(courseId);
  }

  /**
   * Calcula el precio mínimo para un campo específico
   * basado en todas las reglas de precios configuradas
   */
  getMinimumPrice(courseId: string): number {
    const priceRules = this.priceRules.get(courseId) || [];
    const baseProduct = this.baseProducts.get(courseId);
    const basePrice = baseProduct?.greenFeeBaseUsd || 95;
    
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
      console.warn('No auth token set for pricing engine, using default data');
      return false;
    }

    try {
      const { adminFetch } = await import('@/lib/admin-fetch');
      const response = await adminFetch(`/api/admin/pricing/load?courseId=${courseId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('Unauthorized access to pricing data, using default data');
        } else {
          console.error('Failed to load pricing data:', response.statusText);
        }
        return false;
      }

      const result = await response.json();
      if (!result.ok) {
        console.error('API error loading pricing data:', result.error);
        return false;
      }

      const { seasons, timeBands, priceRules, specialOverrides, baseProduct } = result.data;

      // Load data into memory (replace even when empty to reflect deletions)
      this.seasons.set(courseId, Array.isArray(seasons) ? seasons : []);
      this.timeBands.set(courseId, Array.isArray(timeBands) ? timeBands : []);
      this.priceRules.set(courseId, Array.isArray(priceRules) ? priceRules : []);

      // Replace overrides for this course
      const courseOverrides = Array.isArray(specialOverrides)
        ? specialOverrides.filter((o: any) => o.courseId === courseId)
        : [];
      const otherOverrides = this.specialOverrides.filter(o => o.courseId !== courseId);
      this.specialOverrides = [...otherOverrides, ...courseOverrides];
      
      if (baseProduct) {
        const mappedBaseProduct: BaseProduct = {
          id: baseProduct.id || 'default',
          courseId,
          greenFeeBaseUsd: typeof baseProduct.greenFeeBaseUsd === 'number'
            ? baseProduct.greenFeeBaseUsd
            : (typeof baseProduct.basePrice === 'number' ? baseProduct.basePrice : 0),
          cartFeeUsd: baseProduct.cartFeeUsd ?? undefined,
          caddieFeeUsd: baseProduct.caddieFeeUsd ?? undefined,
          insuranceFeeUsd: baseProduct.insuranceFeeUsd ?? undefined,
          updatedAt: baseProduct.updatedAt || new Date().toISOString()
        };
        this.baseProducts.set(courseId, mappedBaseProduct);
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
      // Assemble payload including baseProduct mapped to server schema
      const baseProduct = this.getBaseProduct(courseId);
      const pricingData = {
        courseId,
        seasons: this.getSeasons(courseId),
        timeBands: this.getTimeBands(courseId),
        priceRules: this.getPriceRules(courseId),
        specialOverrides: this.getSpecialOverrides(courseId),
        baseProduct: baseProduct ? {
          id: baseProduct.id || 'default',
          courseId,
          name: 'Green Fee Base',
          basePrice: baseProduct.greenFeeBaseUsd,
          currency: 'USD',
          active: true,
          updatedAt: baseProduct.updatedAt || new Date().toISOString()
        } : undefined
      };

      const { adminFetch } = await import('@/lib/admin-fetch');
      const response = await adminFetch('/api/admin/pricing/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pricingData)
      });

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch {}
        console.error('Failed to save pricing data:', response.status, response.statusText, errorText);
        return false;
      }

      const result = await response.json();
      if (!result.ok) {
        console.error('API error saving pricing data:', result.error, result.details ?? '');
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

  // Deletion with persistence helpers
  async deleteSeasonWithPersistence(id: string): Promise<boolean> {
    let courseId: string | null = null;
    for (const [cid, seasons] of this.seasons.entries()) {
      if (seasons.some(s => s.id === id)) {
        courseId = cid;
        break;
      }
    }
    const ok = this.deleteSeason(id);
    if (!ok || !courseId) return false;
    const saveOk = await this.savePricingData(courseId);
    return ok && saveOk;
  }

  async deleteTimeBandWithPersistence(id: string): Promise<boolean> {
    let courseId: string | null = null;
    for (const [cid, timeBands] of this.timeBands.entries()) {
      if (timeBands.some(t => t.id === id)) {
        courseId = cid;
        break;
      }
    }
    const ok = this.deleteTimeBand(id);
    if (!ok || !courseId) return false;
    const saveOk = await this.savePricingData(courseId);
    return ok && saveOk;
  }

  async deletePriceRuleWithPersistence(id: string): Promise<boolean> {
    let courseId: string | null = null;
    for (const [cid, rules] of this.priceRules.entries()) {
      if (rules.some(r => r.id === id)) {
        courseId = cid;
        break;
      }
    }
    const ok = this.deletePriceRule(id);
    if (!ok || !courseId) return false;
    const saveOk = await this.savePricingData(courseId);
    return ok && saveOk;
  }

  // Deduplication helpers
  dedupeTimeBands(courseId: string): number {
    const bands = this.getTimeBands(courseId);
    if (!bands || bands.length === 0) return 0;
    
    // Para Puerto Los Cabos, mantener solo las 3 bandas principales
    if (courseId === 'puerto-los-cabos') {
      const targetBands = [
        { startTime: '07:00', endTime: '11:50', label: '07:00–11:50' },
        { startTime: '12:00', endTime: '13:20', label: '12:00–13:20' },
        { startTime: '13:30', endTime: '19:00', label: '13:30–19:00' }
      ];
      
      const unique: TimeBand[] = [];
      for (const target of targetBands) {
        // Buscar la primera banda que coincida con este horario
        const match = bands.find(b => 
          b.startTime === target.startTime && 
          b.endTime === target.endTime
        );
        if (match) {
          // Actualizar el label si es necesario
          unique.push({
            ...match,
            label: target.label
          });
        }
      }
      
      const removed = bands.length - unique.length;
      this.timeBands.set(courseId, unique);
      this.invalidateCache(courseId);
      return removed;
    }
    
    // Para otros cursos, usar la lógica original
    const seen = new Set<string>();
    const unique: TimeBand[] = [];
    for (const b of bands) {
      const key = `${(b.label || '').trim().toLowerCase()}|${b.startTime}|${b.endTime}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(b);
      }
    }
    const removed = bands.length - unique.length;
    this.timeBands.set(courseId, unique);
    this.invalidateCache(courseId);
    return removed;
  }

  dedupePriceRules(courseId: string): number {
    const rules = this.getPriceRules(courseId);
    if (!rules || rules.length === 0) return 0;
    
    // Para Puerto Los Cabos, mantener solo una regla por banda horaria (la de mayor prioridad)
    if (courseId === 'puerto-los-cabos') {
      const timeBands = this.getTimeBands(courseId);
      const unique: PriceRule[] = [];
      
      // Agrupar reglas por timeBandId
      const rulesByTimeBand = new Map<string, PriceRule[]>();
      for (const rule of rules) {
        if (rule.timeBandId) {
          if (!rulesByTimeBand.has(rule.timeBandId)) {
            rulesByTimeBand.set(rule.timeBandId, []);
          }
          rulesByTimeBand.get(rule.timeBandId)!.push(rule);
        } else {
          // Reglas sin timeBandId se mantienen (reglas generales)
          unique.push(rule);
        }
      }
      
      // Para cada banda horaria, mantener solo la regla de mayor prioridad
      for (const [timeBandId, bandRules] of rulesByTimeBand.entries()) {
        if (bandRules.length > 0) {
          // Ordenar por prioridad (mayor primero) y luego por fecha de actualización
          const bestRule = bandRules.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            const aUpdated = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const bUpdated = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return bUpdated - aUpdated;
          })[0];
          unique.push(bestRule);
        }
      }
      
      const removed = rules.length - unique.length;
      this.priceRules.set(courseId, unique);
      this.invalidateCache(courseId);
      return removed;
    }
    
    // Para otros cursos, usar la lógica original
    const seen = new Set<string>();
    const unique: PriceRule[] = [];
    for (const r of rules) {
      const keyParts = [
        (r.name || '').trim().toLowerCase(),
        r.seasonId || '',
        r.timeBandId || '',
        (r.dow || []).join(','),
        String(r.leadTimeMin ?? ''),
        String(r.leadTimeMax ?? ''),
        String(r.occupancyMin ?? ''),
        String(r.occupancyMax ?? ''),
        String(r.playersMin ?? ''),
        String(r.playersMax ?? ''),
        r.priceType,
        String(r.priceValue),
        String(r.priority),
        String(r.active),
        r.effectiveFrom || '',
        r.effectiveTo || '',
        String(r.minPrice ?? ''),
        String(r.maxPrice ?? ''),
        String(r.roundTo ?? '')
      ];
      const key = keyParts.join('|');
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }
    const removed = rules.length - unique.length;
    this.priceRules.set(courseId, unique);
    this.invalidateCache(courseId);
    return removed;
  }

  // Deduplicate by rule name only. Keeps one per name using strategy.
  dedupePriceRulesByName(courseId: string, strategy: 'highest_priority' | 'latest' = 'highest_priority'): number {
    const rules = this.getPriceRules(courseId);
    if (!rules || rules.length === 0) return 0;
    const groups = new Map<string, PriceRule[]>();
    for (const r of rules) {
      const key = (r.name || '').trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    const selected: PriceRule[] = [];
    for (const [, list] of groups.entries()) {
      if (list.length === 1) {
        selected.push(list[0]);
      } else {
        let keep: PriceRule = list[0];
        if (strategy === 'highest_priority') {
          keep = list.reduce((acc, cur) => {
            if (cur.priority > acc.priority) return cur;
            if (cur.priority === acc.priority) {
              const accUpdated = acc.updatedAt ? new Date(acc.updatedAt).getTime() : 0;
              const curUpdated = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
              return curUpdated > accUpdated ? cur : acc;
            }
            return acc;
          }, list[0]);
        } else {
          keep = list.reduce((acc, cur) => {
            const accUpdated = acc.updatedAt ? new Date(acc.updatedAt).getTime() : 0;
            const curUpdated = cur.updatedAt ? new Date(cur.updatedAt).getTime() : 0;
            return curUpdated > accUpdated ? cur : acc;
          }, list[0]);
        }
        selected.push(keep);
      }
    }
    const removed = rules.length - selected.length;
    this.priceRules.set(courseId, selected);
    this.invalidateCache(courseId);
    return removed;
  }

  async dedupePriceRulesByNameWithPersistence(courseId: string, strategy: 'highest_priority' | 'latest' = 'highest_priority'): Promise<number> {
    const removed = this.dedupePriceRulesByName(courseId, strategy);
    const saveOk = await this.savePricingData(courseId);
    if (!saveOk) {
      console.error('Failed to persist price rule name deduplication');
    }
    return removed;
  }

  async dedupeAllPricingWithPersistence(courseId: string): Promise<{removedBands: number, removedRules: number}> {
    const removedBands = this.dedupeTimeBands(courseId);
    const removedRules = this.dedupePriceRules(courseId);
    const saveOk = await this.savePricingData(courseId);
    if (!saveOk) {
      console.error('Failed to persist deduplication');
    }
    return { removedBands, removedRules };
  }

  // Nuevas funciones para eliminar duplicados directamente en Firestore
  async dedupeTimeBandsInFirestore(courseId: string): Promise<number> {
    if (!this.authToken) {
      throw new Error('Authentication token required');
    }

    const { adminFetch } = await import('@/lib/admin-fetch');
    const response = await adminFetch('/api/admin/pricing/dedupe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        courseId,
        type: 'timeBands'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to dedupe time bands in Firestore');
    }

    const result = await response.json();
    return result.removedCount;
  }

  async dedupePriceRulesInFirestore(courseId: string): Promise<number> {
    if (!this.authToken) {
      throw new Error('Authentication token required');
    }

    const { adminFetch } = await import('@/lib/admin-fetch');
    const response = await adminFetch('/api/admin/pricing/dedupe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        courseId,
        type: 'priceRules'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to dedupe price rules in Firestore');
    }

    const result = await response.json();
    return result.removedCount;
  }

  async dedupePriceRulesByNameInFirestore(courseId: string, strategy: 'highest_priority' | 'latest' = 'highest_priority'): Promise<number> {
    if (!this.authToken) {
      throw new Error('Authentication token required');
    }

    const { adminFetch } = await import('@/lib/admin-fetch');
    const response = await adminFetch('/api/admin/pricing/dedupe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        courseId,
        type: 'priceRulesByName',
        strategy
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to dedupe price rules by name in Firestore');
    }

    const result = await response.json();
    return result.removedCount;
  }

  async dedupeAllPricingInFirestore(courseId: string): Promise<{removedCount: number}> {
    if (!this.authToken) {
      throw new Error('Authentication token required');
    }

    const { adminFetch } = await import('@/lib/admin-fetch');
    const response = await adminFetch('/api/admin/pricing/dedupe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        courseId,
        type: 'all'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to dedupe pricing data in Firestore');
    }

    const result = await response.json();
    return { removedCount: result.removedCount };
  }
}

// Instancia singleton
export const pricingEngine = new PricingEngine();
