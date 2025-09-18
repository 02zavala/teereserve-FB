
"use client";

import { useState, useEffect } from "react";
import { getCoupons } from "@/lib/data";
import { CouponManager } from "@/components/admin/CouponManager";
import { Skeleton } from "@/components/ui/skeleton";
import type { Coupon } from "@/types";

export default function CouponsAdminPage() {
    const [initialCoupons, setInitialCoupons] = useState<Coupon[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadCoupons() {
            try {
                const coupons = await getCoupons();
                setInitialCoupons(coupons);
            } catch (error) {
                console.error('Error loading coupons:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadCoupons();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline text-primary mb-2">Manage Coupons</h1>
                    <p className="text-muted-foreground">Create and manage discount codes for your customers.</p>
                </div>
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold font-headline text-primary mb-2">Manage Coupons</h1>
                <p className="text-muted-foreground">Create and manage discount codes for your customers.</p>
            </div>
            <CouponManager initialCoupons={initialCoupons} />
        </div>
    );
}
