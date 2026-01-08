import { useState } from 'react';
import { useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface CardValidationResult {
  success: boolean;
  validated: boolean;
  paymentIntentId?: string;
  refundId?: string;
  requiresAction?: boolean;
  clientSecret?: string;
  error?: string;
  warning?: string;
  message?: string;
}

export function useCardValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();

  const validateCard = async (paymentMethodId: string): Promise<CardValidationResult> => {
    if (!stripe || !elements || !user) {
      const error = 'Stripe not loaded or user not authenticated';
      logger.error(
        'Card validation: Prerequisites not met',
        undefined,
        'useCardValidation',
        {
          hasStripe: !!stripe,
          hasElements: !!elements,
          hasUser: !!user
        }
      );
      return { success: false, validated: false, error };
    }

    setIsValidating(true);
    
    try {
      // Get the user's ID token for authentication
      const idToken = await user.getIdToken();
      
      logger.info(
        'Card validation: Starting validation process',
        'useCardValidation',
        {
          userId: user.uid,
          paymentMethodId
        }
      );

      // Call the validation API
      const response = await fetch('/api/validate-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentMethodId,
          idToken
        })
      });

      const result: CardValidationResult = await response.json();

      if (!response.ok) {
        logger.error(
          'Card validation: API request failed',
          undefined,
          'useCardValidation',
          {
            userId: user.uid,
            status: response.status,
            error: result.error
          }
        );
        return {
          success: false,
          validated: false,
          error: result.error || 'Failed to validate card'
        };
      }

      // Handle case where 3D Secure authentication is required
      if (result.requiresAction && result.clientSecret) {
        logger.info(
          'Card validation: 3D Secure authentication required',
          'useCardValidation',
          {
            userId: user.uid,
            paymentIntentId: result.paymentIntentId
          }
        );

        toast.info('Autenticación 3D Secure requerida', {
          description: 'Tu banco requiere verificación adicional para validar la tarjeta.'
        });

        // Confirm the payment with 3D Secure
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          logger.error(
            'Card validation: 3D Secure confirmation failed',
            undefined,
            'useCardValidation',
            {
              userId: user.uid,
              error: confirmError
            }
          );
          
          return {
            success: false,
            validated: false,
            error: confirmError.message || 'Failed to complete 3D Secure authentication'
          };
        }

        if (paymentIntent?.status === 'succeeded') {
          // Complete the validation process
          const completionResponse = await fetch('/api/validate-card', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              idToken
            })
          });

          const completionResult: CardValidationResult = await completionResponse.json();

          if (completionResponse.ok && completionResult.success) {
            logger.info(
              'Card validation: Completed successfully after 3D Secure',
              'useCardValidation',
              {
                userId: user.uid,
                paymentIntentId: paymentIntent.id,
                refundId: completionResult.refundId
              }
            );

            toast.success('Tarjeta validada exitosamente', {
              description: 'El cargo de $1 USD ha sido reembolsado automáticamente.'
            });

            return completionResult;
          } else {
            logger.error(
              'Card validation: Completion failed after 3D Secure',
              undefined,
              'useCardValidation',
              {
                userId: user.uid,
                error: completionResult.error
              }
            );
            
            return {
              success: false,
              validated: false,
              error: completionResult.error || 'Failed to complete validation after 3D Secure'
            };
          }
        }
      }

      // Handle immediate success (no 3D Secure required)
      if (result.success && result.validated) {
        logger.info(
          'Card validation: Completed successfully without 3D Secure',
          'useCardValidation',
          {
            userId: user.uid,
            paymentIntentId: result.paymentIntentId,
            refundId: result.refundId
          }
        );

        if (result.warning) {
          toast.warning('Tarjeta validada con advertencia', {
            description: result.warning
          });
        } else {
          toast.success('Tarjeta validada exitosamente', {
            description: 'El cargo de $1 USD ha sido reembolsado automáticamente.'
          });
        }

        return result;
      }

      // Handle validation failure
      logger.warn(
        'Card validation: Validation failed',
        'useCardValidation',
        {
          userId: user.uid,
          result
        }
      );
      
      return {
        success: false,
        validated: false,
        error: result.error || 'Card validation failed'
      };

    } catch (error) {
      logger.error(
        'Card validation: Unexpected error',
        error instanceof Error ? error : undefined,
        'useCardValidation',
        {
          userId: user?.uid,
          error
        }
      );
      
      return {
        success: false,
        validated: false,
        error: 'An unexpected error occurred during card validation'
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateCard,
    isValidating
  };
}