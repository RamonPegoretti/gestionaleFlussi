import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // PGlite (local database) and ExcelJS run on the server only.
  serverExternalPackages: ["@electric-sql/pglite", "exceljs"],
  // The ISTAT template is read from disk when exporting.
  outputFileTracingIncludes: { "/api/export": ["./templates/**/*"] },
};

export default withNextIntl(nextConfig);
