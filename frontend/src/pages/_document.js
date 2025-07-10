// frontend/src/pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Stripe JavaScript SDK */}
          <script src="https://js.stripe.com/basil/stripe.js" async />
          {/* Stripe Crypto Onramp SDK */}
          <script src="https://crypto-js.stripe.com/crypto-onramp-outer.js" async />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;