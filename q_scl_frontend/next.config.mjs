/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable App router's default Turbopack in v16 for our Webpack polyfills
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        os: false,
        path: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
      };
    }

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Suppress "Critical dependency" warning from ox/tempo (viem → WalletConnect)
    config.plugins.push(
      new webpack.ContextReplacementPlugin(
        /ox[\/\\]_esm[\/\\]tempo[\/\\]internal/,
        (data) => {
          // Prevent webpack from parsing dynamic require() in virtualMasterPool
          delete data.dependencies[0]?.critical;
          return data;
        }
      )
    );

    // Also ignore the module entirely since we don't use Tempo chain
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /virtualMasterPool/,
        contextRegExp: /ox[\/\\]_esm[\/\\]tempo/,
      })
    );

    return config;
  },

  transpilePackages: [
    '@solana/wallet-adapter-base',
    '@solana/wallet-adapter-react',
    '@solana/wallet-adapter-react-ui',
    '@solana/wallet-adapter-wallets',
    '@coral-xyz/anchor',
  ],
};

export default nextConfig;
