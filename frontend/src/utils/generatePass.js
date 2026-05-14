// src/utils/passwordUtils.js

/**
 * Genera una contraseña aleatoria con una longitud específica.
 * @param {number} length - Longitud de la contraseña.
 * @returns {string} La contraseña generada.
 */
export const generatePassword = (length = 10) => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  };
  