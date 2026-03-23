import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#FFD700", // 대략적인 레고 옐로우 색상
            }
        },
    },
    plugins: [],
};
export default config;
