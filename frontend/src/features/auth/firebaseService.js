import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../config/firebase"; // Asegúrate de tener el archivo de configuración Firebase

/**
 * Crear un nuevo usuario en Firebase Authentication.
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<object>} Información del usuario creado.
 */
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    console.error("Error al crear usuario:", error);
    throw new Error(error.message);
  }
};

/**
 * Iniciar sesión de un usuario con Firebase Authentication.
 * @param {string} email - Correo electrónico del usuario.
 * @param {string} password - Contraseña del usuario.
 * @returns {Promise<object>} Información del usuario autenticado.
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    return user;
  } catch (error) {
    console.error("Error al iniciar sesión:", error);
    throw new Error(error.message);
  }
};
