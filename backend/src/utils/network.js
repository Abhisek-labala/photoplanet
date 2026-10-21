const os = require('os');

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({
          interface: name,
          address: iface.address
        });
      }
    }
  }

  return addresses;
}

function getPrimaryLocalIp() {
  const ips = getLocalIpAddresses();
  // Prefer Wi-Fi or Ethernet
  const preferred = ips.find(i => /wi-?fi|wlan|eth|ethernet/i.test(i.interface));
  if (preferred) return preferred.address;
  return ips.length > 0 ? ips[0].address : '127.0.0.1';
}

module.exports = {
  getLocalIpAddresses,
  getPrimaryLocalIp
};
