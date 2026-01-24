import './globals.css';
import RootLayoutClient from './layout-client';

export const metadata = {
  title: 'BookingApp',
  description: 'Service Booking Application'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <RootLayoutClient>
          {children}
        </RootLayoutClient>
      </body>
    </html>
  );
}