import { Api, ApiInterfaces, RpcInterfaces, JsonRpc } from 'eosjs';
import { WalletProvider, NetworkConfig, WalletAuth, DiscoveryOptions } from 'eos-transit';

let accountPublickey: string;
let lynx: any;

if (typeof window !== undefined && typeof document !== undefined) {
	// @ts-ignore:

	lynx = window.lynxMobile;
	window.addEventListener('lynxMobileLoaded', () => {
		// @ts-ignore:
		lynx = window.lynxMobile;
	});
}

function logIfDebugEnabled(msg: string) {
	const debug = localStorage.getItem('DEBUG');
	if (debug === 'true') {
		console.log('IN WALLET: ' + msg);
	}
}

function makeSignatureProvider(network: NetworkConfig) {
	return {
		async getAvailableKeys() {
			logIfDebugEnabled('In getAvailableKeys');

			logIfDebugEnabled('Return Key: ' + accountPublickey);
			const arr: string[] = [ accountPublickey ];
			return arr;
		},

		async sign(
			signatureProviderArgs: ApiInterfaces.SignatureProviderArgs
		): Promise<RpcInterfaces.PushTransactionArgs> {
			logIfDebugEnabled('In Sign');

			const rpc = new JsonRpc(network.protocol + '://' + network.host + ':' + network.port);
			const args = {
				rpc,
				authorityProvider: undefined,
				abiProvider: undefined,
				signatureProvider: this,
				chainId: undefined,
				textEncoder: undefined,
				textDecoder: undefined
			};
			const api = new Api(args);
			const _txn = await api.deserializeTransactionWithActions(signatureProviderArgs.serializedTransaction);

			// logIfDebugEnabled(JSON.stringify(_txn));

			// @ts-ignore:
			const signatureResponse = await lynx.requestSignature(_txn);

			logIfDebugEnabled('signature: ' + signatureResponse.signatures[0]);

			const signatureArray = [ signatureResponse.signatures[0] ];
			const respone: RpcInterfaces.PushTransactionArgs = {
				signatures: signatureArray,
				serializedTransaction: signatureProviderArgs.serializedTransaction
			};

			return respone;
		}
	};
}

export function lynxWalletProvider() {
	return function makeWalletProvider(network: NetworkConfig): WalletProvider {
		// Connection

		function connect(appName: string) {
			logIfDebugEnabled('In wallet connect');
			return new Promise((resolve, reject) => {
				let tries = 0;

				function checkConnect() {
					logIfDebugEnabled('Checking the state of lynx Object: ' + tries + ' : ' + lynx);
					if (lynx) return resolve(true);

					tries++;

					if (tries > 5) return reject('Cannot connect to lynx wallet provider');

					setTimeout(() => {
						checkConnect();
					}, 1000);
				}

				checkConnect();
			});
		}

		function discover(discoveryOptions: DiscoveryOptions) {
			logIfDebugEnabled('The discover() method of myWallet was called');

			return new Promise((resolve, reject) => {
				const discoveryInfo = {
					keys: [],
					note: 'Wallet does not support discovery'
				};

				resolve(discoveryInfo);
			});
		}

		function disconnect(): Promise<any> {
			return Promise.resolve(true);
		}

		function signArbitrary(data: string, userMessage: string): Promise<string> {
			// @ts-ignore:
			return lynx.requestArbitrarySignature({ data, whatFor: userMessage });
		}

		// Authentication
		async function login(accountName?: string): Promise<WalletAuth> {
			logIfDebugEnabled('The login method of myWallet was called');

			// @ts-ignore:
			const _accountName = await lynx.requestSetAccountName();
			logIfDebugEnabled(_accountName);
			if (!_accountName) throw new Error('Account name was null');

			// @ts-ignore:
			const accountState = await lynx.requestSetAccount(_accountName);
			if (!accountState) throw new Error('Account state was null');

			const perm = accountState.account.permissions.find((x: any) => x.perm_name === 'active');
			const publicKey: string = perm.required_auth.keys[0].key;
			accountPublickey = publicKey;

			logIfDebugEnabled(publicKey);

			return {
				accountName: _accountName,
				permission: 'active',
				publicKey
			};
		}

		function logout(accountName?: string): Promise<any> {
			const res = async function m2(): Promise<any> {
				if (true) return true;
			};
			return res();
		}

		const walletProvider: WalletProvider = {
			id: 'EOS Lynx',
			meta: {
				name: 'EOS Lynx',
				shortName: 'EOS Lynx',
				description: 'EOS Lynx Wallet'
			},
			signatureProvider: makeSignatureProvider(network),
			connect,
			discover,
			disconnect,
			login,
			logout,
			signArbitrary
		};

		return walletProvider;
	};
}

export default lynxWalletProvider;


// force rebuild 2