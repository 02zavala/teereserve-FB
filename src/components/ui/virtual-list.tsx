"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { pricingEngine } from '@/lib/pricing-engine';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number; // Número de elementos extra a renderizar fuera del viewport
  onScroll?: (scrollTop: number) => void;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5,
  onScroll,
  loadingComponent,
  emptyComponent
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calcular qué elementos son visibles
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);
    onScroll?.(scrollTop);
  }, [onScroll]);

  // Scroll suave a un elemento específico
  const scrollToIndex = useCallback((index: number) => {
    if (scrollElementRef.current) {
      const scrollTop = index * itemHeight;
      scrollElementRef.current.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [itemHeight]);

  if (items.length === 0 && emptyComponent) {
    return <div className={className}>{emptyComponent}</div>;
  }

  return (
    <div
      ref={scrollElementRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              className="flex items-center"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook para usar con VirtualList
export function useVirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) {
  const [scrollTop, setScrollTop] = useState(0);

  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  return {
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex,
    setScrollTop
  };
}

// Componente especializado para lista de cursos
interface CourseListItem {
  id: string;
  name: string;
  location: string;
  basePrice: number;
  rating: number;
  imageUrl?: string;
}

interface VirtualCourseListProps {
  courses: CourseListItem[];
  onCourseSelect: (course: CourseListItem) => void;
  className?: string;
  containerHeight?: number;
}

export function VirtualCourseList({
  courses,
  onCourseSelect,
  className,
  containerHeight = 400
}: VirtualCourseListProps) {
  const renderCourseItem = useCallback((course: CourseListItem, index: number) => (
    <div
      className="flex items-center p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onCourseSelect(course)}
    >
      <div className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg mr-4">
        {course.imageUrl && (
          <img
            src={course.imageUrl}
            alt={course.name}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold truncate">{course.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{course.location}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm font-medium">${pricingEngine.getMinimumPrice(course.id)}</span>
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground">★</span>
            <span className="text-sm ml-1">{course.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
    </div>
  ), [onCourseSelect]);

  return (
    <VirtualList
      items={courses}
      itemHeight={96} // Altura de cada item de curso
      containerHeight={containerHeight}
      renderItem={renderCourseItem}
      className={className}
      emptyComponent={
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No se encontraron cursos
        </div>
      }
    />
  );
}

// Componente especializado para lista de reservas
interface BookingListItem {
  id: string;
  courseName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  players: number;
  totalPrice: number;
}

interface VirtualBookingListProps {
  bookings: BookingListItem[];
  onBookingSelect: (booking: BookingListItem) => void;
  className?: string;
  containerHeight?: number;
}

export function VirtualBookingList({
  bookings,
  onBookingSelect,
  className,
  containerHeight = 400
}: VirtualBookingListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'cancelled': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const renderBookingItem = useCallback((booking: BookingListItem, index: number) => (
    <div
      className="flex items-center p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onBookingSelect(booking)}
    >
      <div className="flex-1">
        <h3 className="font-semibold">{booking.courseName}</h3>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span>{booking.date}</span>
          <span>{booking.time}</span>
          <span>{booking.players} jugadores</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className={cn('text-sm font-medium', getStatusColor(booking.status))}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          <span className="text-sm font-medium">${booking.totalPrice}</span>
        </div>
      </div>
    </div>
  ), [onBookingSelect]);

  return (
    <VirtualList
      items={bookings}
      itemHeight={88} // Altura de cada item de reserva
      containerHeight={containerHeight}
      renderItem={renderBookingItem}
      className={className}
      emptyComponent={
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          No tienes reservas
        </div>
      }
    />
  );
}