// src/ajv-errors.d.ts
declare module 'ajv-errors' {
  import { Ajv } from 'ajv';
  function ajvErrors(ajv: Ajv, options?: any): Ajv;
  export default ajvErrors;
}