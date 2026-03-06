

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
        <span className="text-6xl mb-4">🚧</span>
        <h2 className="text-2xl font-bold text-gray-600">{title}</h2>
        <p>Esta sección está en construcción.</p>
    </div>
);

export const ResourcesPage = () => <PlaceholderPage title="Recursos y Altas" />;
export const InvoicesPage = () => <PlaceholderPage title="Facturación" />;
