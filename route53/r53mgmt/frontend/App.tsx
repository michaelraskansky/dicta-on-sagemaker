import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Dashboard } from '@/pages/Dashboard';
import { ZoneDetail } from '@/pages/ZoneDetail';
import { HealthChecks } from '@/pages/HealthChecks';
import { DnsFirewall } from '@/pages/DnsFirewall';
import { TrafficFlow } from '@/pages/TrafficFlow';
import { Domains } from '@/pages/Domains';
import { ResolverVpc } from '@/pages/ResolverVpc';
import { ZoneOperations } from '@/pages/ZoneOperations';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/zone/:zoneId" element={<ZoneDetail />} />
            <Route path="/health-checks" element={<HealthChecks />} />
            <Route path="/firewall" element={<DnsFirewall />} />
            <Route path="/traffic-flow" element={<TrafficFlow />} />
            <Route path="/domains" element={<Domains />} />
            <Route path="/resolver" element={<ResolverVpc />} />
            <Route path="/operations" element={<ZoneOperations />} />
            <Route path="/key-rotation" element={<Navigate to="/operations?type=ksk-rotation" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
