const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(403).json({ message: 'Se requiere un token para la autenticación' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_para_desarrollo');
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ message: 'Token no válido o expirado' });
    }
    return next();
};

const checkRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
        }
        next();
    };
};

module.exports = {
    verifyToken,
    checkRole
};