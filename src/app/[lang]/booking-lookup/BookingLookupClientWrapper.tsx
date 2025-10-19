"use client";
import dynamic from "next/dynamic";

const BookingLookupClient = dynamic(() => import("./BookingLookupClient").then(m => m.BookingLookupClient), {
  ssr: false,
  loading: () => (
    <div className="text-center text-muted-foreground">Cargando buscador de reservas...</div>
  ),
});

export default function BookingLookupClientWrapper(props: { dictionary: any; lang: string }) {
  return <BookingLookupClient {...props} />;
}