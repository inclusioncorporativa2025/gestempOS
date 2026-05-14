// Crea un pequeño script para capturar el subdominio.

export const getSubdomain = () => {
    const host = window.location.hostname;
    const subdomain = host.split('.')[0];
    return subdomain;
};
