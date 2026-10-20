import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
export default defineConfig({base:'./', plugins:process.env.HTTPS ? [basicSsl()] : [], build:{target:'es2022',chunkSizeWarningLimit:1000},server:{host:'0.0.0.0'}});
