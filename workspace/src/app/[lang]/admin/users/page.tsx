
"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUsers, updateUserRole } from "@/lib/data";
import type { UserProfile } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

function RoleSelector({ user, currentUserRole }: { user: UserProfile, currentUserRole?: UserProfile['role'] }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [selectedRole, setSelectedRole] = useState(user.role);

    const handleRoleChange = (newRole: UserProfile['role']) => {
        startTransition(async () => {
            try {
                await updateUserRole(user.uid, newRole);
                setSelectedRole(newRole);
                toast({
                    title: "Role Updated",
                    description: `${user.displayName || user.email}'s role has been updated to ${newRole}.`
                });
            } catch (error) {
                console.error("Failed to update role:", error);
                toast({
                    title: "Update Failed",
                    description: "Could not update the user's role.",
                    variant: "destructive"
                });
            }
        });
    };
    
    // An Admin cannot edit a SuperAdmin's role
    const isDisabled = user.role === 'SuperAdmin' && currentUserRole === 'Admin';

    return (
        <div className="flex items-center gap-2">
            <Select
                value={selectedRole}
                onValueChange={handleRoleChange}
                disabled={isPending || isDisabled}
            >
                <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Customer">Customer</SelectItem>
                    <SelectItem value="Affiliate">Affiliate</SelectItem>
                </SelectContent>
            </Select>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
    );
}

export default function UsersAdminPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);

    useEffect(() => {
        getUsers().then(fetchedUsers => {
            setUsers(fetchedUsers);
            if (currentUser) {
                const profile = fetchedUsers.find(u => u.uid === currentUser.uid);
                setCurrentUserProfile(profile || null);
            }
            setLoading(false);
        }).catch(err => {
            console.error("Failed to fetch users:", err);
            setLoading(false);
        });
    }, [currentUser]);
    
    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                 <h1 className="text-3xl font-bold font-headline text-primary">Manage Users</h1>
                 <Button disabled>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add New User
                 </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map(user => (
                                    <TableRow key={user.uid}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarImage src={user.photoURL || `https://i.pravatar.cc/40?u=${user.uid}`} alt={user.displayName || 'user'} />
                                                    <AvatarFallback>{user.displayName?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                                                </Avatar>
                                                <span className="font-medium">{user.displayName || 'N/A'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                           <RoleSelector user={user} currentUserRole={currentUserProfile?.role} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
