"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePaymentMethods, SavedPaymentMethod } from '@/hooks/usePaymentMethods';
import { CreditCard, Trash2, Plus, Check } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface SavedPaymentMethodsProps {
  onSelectPaymentMethod?: (paymentMethod: SavedPaymentMethod) => void;
  selectedPaymentMethodId?: string;
  showAddButton?: boolean;
  onAddNewMethod?: () => void;
}

function PaymentMethodCard({ 
  paymentMethod, 
  onDelete, 
  onSelect, 
  isSelected = false,
  showActions = true 
}: {
  paymentMethod: SavedPaymentMethod;
  onDelete?: (id: string) => void;
  onSelect?: (paymentMethod: SavedPaymentMethod) => void;
  isSelected?: boolean;
  showActions?: boolean;
}) {
  const getCardBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case 'visa':
        return '💳';
      case 'mastercard':
        return '💳';
      case 'amex':
        return '💳';
      default:
        return '💳';
    }
  };

  const formatCardBrand = (brand: string) => {
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      }`}
      onClick={() => onSelect?.(paymentMethod)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">
              {getCardBrandIcon(paymentMethod.card.brand)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">
                  {formatCardBrand(paymentMethod.card.brand)} •••• {paymentMethod.card.last4}
                </span>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Expires {paymentMethod.card.exp_month.toString().padStart(2, '0')}/{paymentMethod.card.exp_year}
              </p>
            </div>
          </div>
          
          {showActions && onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this payment method? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(paymentMethod.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function SavedPaymentMethods({
  onSelectPaymentMethod,
  selectedPaymentMethodId,
  showAddButton = true,
  onAddNewMethod,
}: SavedPaymentMethodsProps) {
  const { paymentMethods, loading, deletePaymentMethod } = usePaymentMethods();

  const handleDelete = async (paymentMethodId: string) => {
    await deletePaymentMethod(paymentMethodId);
  };

  const handleSelect = (paymentMethod: SavedPaymentMethod) => {
    onSelectPaymentMethod?.(paymentMethod);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Saved Payment Methods</h3>
        {showAddButton && onAddNewMethod && (
          <Button variant="outline" size="sm" onClick={onAddNewMethod}>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        )}
      </div>
      
      {paymentMethods.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No saved payment methods found.
            </p>
            {showAddButton && onAddNewMethod && (
              <Button onClick={onAddNewMethod}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Payment Method
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paymentMethods.map((paymentMethod) => (
            <PaymentMethodCard
              key={paymentMethod.id}
              paymentMethod={paymentMethod}
              onDelete={handleDelete}
              onSelect={handleSelect}
              isSelected={selectedPaymentMethodId === paymentMethod.id}
              showActions={!onSelectPaymentMethod}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SavedPaymentMethods;