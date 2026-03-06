import React from 'react';
import { StradaView } from '../strada/StradaView';

export const TacticalMapPage: React.FC = () => {
    return (
        <div className="h-[calc(100vh-64px)] w-full">
            <StradaView />
        </div>
    );
};
