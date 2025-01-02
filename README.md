## Exclusive Fan Club Platform on NEAR Blockchain
We are developing a premium, token-gated platform for an artist to connect with their 1000 most dedicated fans. This platform will offer exclusive music, video content, and access to private events, all secured by blockchain technology.

#### Technology Stack:
- **Blockchain**: NEAR Blockchain
- **Frontend**: JavaScript with the latest Next.js framework
- **Smart Contract**: An NFT minter contract, limited to 1000 tokens, to be deployed on NEAR's mainnet post-testnet validation.

#### Platform Features:
- **Homepage**: Designed to engage and excite potential members with details about exclusive perks and artist insights.
- **Navigation Bar**: Includes a prominent wallet connect/disconnect button for user authentication.
- **Footer**: Links to the artist's social media platforms for broader community engagement.

#### Membership Verification:
Upon wallet connection, the platform checks for the presence of the valid membership token:
- **Valid Token**: Unlocks content.
- **Invalid Token**: Redirects to a membership purchase page.

#### Content Access:
- **Music Catalog**: Styled like a Spotify playlist, displaying tracks with artist names, song titles, and icons.
- **Video Catalog**: Mimics a YouTube channel interface with video previews, sortable by various filters for user convenience.
- **Event Catalog**: Features a calendar view and a carousel of upcoming events. Clicking an event card leads to a ticket purchase.

#### Development Goals:
- **Security**: Ensuring that all transactions and content access are secure and only accessible to token holders.
- **User Experience**: A Netflix-like UI/UX to ensure ease of navigation and enjoyment of premium content.
- **Scalability**: Preparing the platform for potential expansion while maintaining performance and security.

#### Next Steps:
- ~~Build the frontend with Javascript, HTML and CSS.~~
- ~~Write the smart contract with Rust.~~
- ~~Deploy and test the smart contract on testnet.~~
- ~~Implement a "token check" in the wallet login.~~
- ~~Implement a shop to allow the mint and transfer of fans token. (route users based on wallet connect? and token ownership? action buttons and input fields on the shop UI.~~)
- ~~Update the smart contract: max 1 token per account, token count to automatically set the token ID: fan000, fan001, ..., fan999.~~ 
- ~~Redeploy the contract on a new account 1000fans.testnet. start from scratch with token fan000. re-test all access-keys etc.~~
- Improve platform's design.
- Add a paiement system for mint (buy) and transfer (sell)? nldr: so far the smart contract functions can be called by the contract's owner only (mint, transfer). in the future it could be good to allow any other account to mint it's own token and transfer it to anyone of their choice (min 1 year holding before transfer).
- Test the platform with a closed group of users on testnet.
- Update the platform's design and UI/UX on user feedback.
- Create a series of 1000 images for 1000 fans tokens.
- Deploy the smart contract on mainnet + the platform on public domain.
- Launch to 1000 fans. 

#### Contribute:
We welcome developers passionate about music, blockchain, and creating unique fan experiences to join this project. Let's innovate the way fans connect with artists in a secure, exclusive digital space.