import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.zerain.driverapp',
    appName: 'Torre de Control Zerain',
    webDir: 'dist',
    server: {
        androidScheme: 'https',
        // Allow local development URL if needed, but for production use built assets
        // url: 'http://10.0.2.2:5173', 
        cleartext: true
    },
    plugins: {
        PushNotifications: {
            presentationOptions: ["badge", "sound", "alert"],
        },
    },
};

export default config;
