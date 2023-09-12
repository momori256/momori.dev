const getBaseUrl: () => URL = () => {
  const url = process.env.VERCEL_URL;
  return new URL(url === undefined ? `http://localhost:3000` : `https://${url}`);
};

export { getBaseUrl };
