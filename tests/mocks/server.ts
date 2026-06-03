import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Servidor MSW para interceptar fetch en el entorno Node/Jest.
 * Se inicia en beforeAll, se resetea en afterEach y se cierra en afterAll.
 */
export const server = setupServer(...handlers);
