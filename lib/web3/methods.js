'use babel'
// methods.js are collection of various functions used to execute calls on web3

import Web3 from 'web3'
import ethJSABI from 'ethereumjs-abi'
import EthJSTX from 'ethereumjs-tx'
import { MessagePanelView, PlainMessageView, LineMessageView } from 'atom-message-panel'

export default class Web3Helpers {
	constructor(web3) {
		this.web3 = web3;
	}
	compileWeb3(source, callback) {
		this.web3.eth.compile.solidity(source, (err, output) => {
			if(err) {
				callback(err);
			} else {
				callback(null, output);
			}
		});
	}
	create(coinbase, password, abi, code, constructorParams, contractName, estimatedGas, callback) {
		if(coinbase && password) {
			this.web3.eth.defaultAccount = coinbase;
			this.web3.personal.unlockAccount(this.web3.eth.defaultAccount, password, (error, success) => {
				if(error) {
					callback(error);
				} else {
					let contract;
					contract = this.web3.eth.contract(abi);
					contract.new(constructorParams.toString(), {
						from: this.web3.eth.defaultAccount,
						data: code,
						gas: estimatedGas
					}, (error, contractInst) => {
						if(error) {
							callback(error);
						} else {
							callback(null, contractInst);
						}
					});
				}
			});
		} else {
			callback('Error: No password provided.');
		}
	}
	call(coinbase, password, abi, code, myContract, methodName, argTypes, params, callback) {
		let result, buffer;
		result = "This feature is not fully functional. See issue https://github.com/0mkara/etheratom/issues/34";
		this.web3.eth.defaultAccount = coinbase;
		this.web3.personal.unlockAccount(this.web3.eth.defaultAccount, password, (error, success) => {
			if(error) {
				callback(error);
			} else {
				// Call a contract function or send a transaction to the contract
				// Construct transaction
				let buffer = this.web3.sha3(methodName + '(' + argTypes.toString() + ')').substr(0, 10);
				transaction = {
					to: myContract.address,
					data: buffer,
					gas: this.web3.eth.estimateGas({ data: buffer })
				};
				this.web3.eth.sendTransaction(transaction, (error, result) => {
					if(error) {
						this.showPanelError(error);
						callback(error);
					} else {
						callback(null, result);
					}
				});
			}
		});
		callback(null, result);
	}
	constructFunctions(contractABI, callback) {
		let contractFunction, k, len, results;
		results = [];
		for(k = 0, len = contractABI.length; k < len; k++) {
			contractFunction = contractABI[k];
			if(contractFunction.type = 'function' && contractFunction.name !== null && contractFunction.name !== void 0) {
				results.push(this.createChilds(contractFunction, (error, childInputs) => {
					if(!error) {
						callback(null, [contractFunction.name, childInputs]);
					} else {
						callback(null, [null, null]);
					}
				}));
			} else {
				results.push(void 0);
			}
		}
	}
	createChilds(contractFunction, callback) {
		let i, reactElements;
		reactElements = [];
		i = 0;
		if(contractFunction.inputs.length > 0) {
			while(i < contractFunction.inputs.length) {
				reactElements[i] = [contractFunction.inputs[i].type, contractFunction.inputs[i].name];
				i++;
			}
		}
		callback(null, reactElements);
	}
	typesToArray(reactElements, methodName, callback) {
		let types;
		types = new Array();
		this.asyncLoop(reactElements[methodName].childNodes.length, ((cycle) => {
			if(reactElements[methodName][cycle.iteration()].type !== 'submit') {
				types.push(reactElements[methodName][cycle.iteration()].name);
			}
			cycle.next();
		}), () => {
			callback(null, types);
		});
	}
	argsToArray(reactElements, methodName, callback) {
		let args;
		args = new Array();
		this.asyncLoop(reactElements[methodName].childNodes.length, ((cycle) => {
			if(reactElements[methodName][cycle.iteration()].type !== 'submit') {
				args.push(reactElements[methodName][cycle.iteration()].value);
			}
			cycle.next();
		}), () => {
			callback(null, args);
		});
	}
	constructorsArray(abi, constructorParams, callback) {
		this.asyncLoop(abi.length && abi.length > 0, ((cycle) => {
			if(abi[cycle.iteration()].type === "constructor") {
				this.getConstructorIntoArray(abi[cycle.iteration()], constructorParams, (error, typeArray) => {
					if(!error) {
						callback(null, typeArray);
					}
				});
			}
			cycle.next();
		}), () => {});
	}
	getConstructorIntoArray(constructorAbi, constructorParams, callback) {
		let inputsArr, that, typesArr;
		typesArr = new Array();
		inputsArr = new Array();
		this.asyncLoop(constructorAbi.inputs.length, ((cycle) => {
			typesArr.push(constructorAbi.inputs[cycle.iteration()].type);
			inputsArr.push(constructorParams[constructorAbi.inputs[cycle.iteration()].name] || '');
			cycle.next();
		}), () => {
			callback(null, { types: typesArr, inputs: inputsArr });
		});
	}
	showPanelError(err_message) {
		let messages;
		messages = new MessagePanelView({
			title: 'Etheratom report'
		});
		messages.attach();
		messages.add(new PlainMessageView({
			message: err_message,
			className: 'red-message'
		}));
	}
	showOutput(address, outputTypes, result) {
		let messages, outputBuffer;
		messages = new MessagePanelView({
			title: 'Etheratom output'
		});
		messages.attach();
		messages.add(new PlainMessageView({
			message: 'Contract address: ' + address,
			className: 'green-message'
		}));
		messages.add(new PlainMessageView({
			message: 'Contract output: ' + result,
			className: 'green-message'
		}));
	}
	getOutputTypes(abi, methodName, callback) {
		this.asyncLoop(abi.length, ((cycle) => {
			if(abi[cycle.iteration()].name === methodName) {
				this.outputTypestoArray(abi[cycle.iteration()], (error, outputTypes) => {
					callback(null, outputTypes);
				});
			}
			cycle.next();
		}), () => {});
	}
	outputTypestoArray(funcAbi, callback) {
		let types;
		types = new Array();
		this.asyncLoop(funcAbi.outputs.length, ((cycle) => {
			types.push(funcAbi.outputs[cycle.iteration()].type);
			cycle.next();
		}), () => {
			callback(null, types);
		});
	}
	asyncLoop(iterations, func, callback) {
		let cycle, done, index;
		index = 0;
		done = false;
		cycle = {
			next: function() {
				if(done) {
					return;
				}
				if(index < iterations) {
					index++;
					return func(cycle);
				} else {
					done = true;
					return callback();
				}
			},
			iteration: function() {
				return index - 1;
			},
			break: function() {
				done = true;
				return callback();
			}
		};
		cycle.next();
		return cycle;
	}
}
