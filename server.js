const app = require('./src/app');
const os = require('os');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

function getLocalIps() {
    const interfaces = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ips.push({ name, address: iface.address });
            }
        }
    }
    return ips;
}

app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIps();
    const hostname = os.hostname();
    console.log(`🚀 Servidor Institucional QR listo!`);
    console.log(`- Local: http://localhost:${PORT}`);
    
    ips.forEach(ip => {
        console.log(`- Red:   http://${ip.address}:${PORT} (${ip.name})`);
    });
    
    console.log(`- Host:  http://${hostname}.local:${PORT}`);
    console.log(`\nModo: ${process.env.NODE_ENV || 'development'}`);
});