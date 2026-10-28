export interface Country {
  /** ISO 3166-1 alpha-2 code, e.g. "MX" */
  code: string;
  name: string;
  /** e.g. "+52" */
  dialCode: string;
  flag: string;
}
