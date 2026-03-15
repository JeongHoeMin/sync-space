const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'sync-space-server', 'certs');
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

console.log('Generating 2048-bit key-pair...');
const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();

cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
    { name: 'commonName', value: '19.19.20.49' },
    { name: 'countryName', value: 'KR' },
    { shortName: 'ST', value: 'Seoul' },
    { name: 'localityName', value: 'Seoul' },
    { name: 'organizationName', value: 'SyncSpace' },
    { shortName: 'OU', value: 'Dev' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// 자가 서명
cert.sign(keys.privateKey);

const pemCert = forge.pki.certificateToPem(cert);
const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(path.join(certDir, 'cert.pem'), pemCert);
fs.writeFileSync(path.join(certDir, 'key.pem'), pemKey);

console.log('SSL Certificate and Key generated successfully in sync-space-server/certs/');
