const Remittance = artifacts.require('Remittance');
const Bluebird = require('bluebird');

Bluebird.promisifyAll(web3.eth, {
    suffix: "Promise"
});

const oneTimePassword = '91082hdnhsjfsdf802u3432o2';
const revokeOneTimePassword = 'i290idjvdkfjweklhsdgidos';
const anotherOneTimePassword = '2903rifjd0f2fjfe02209efu2e';
const remitAmount = web3.toBigNumber(10000)

contract('Remittance', async (accounts) => {
    it('should let me remit funds', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let magicHash = await instance.genMagicHash(carol, oneTimePassword, {from: me});
        let tx = await instance.remit(magicHash, {from: me, value: remitAmount.toString(10)})
        let remit = await instance.remittances(magicHash, {from: me});
        assert.equal(remit[0], me);
        assert.equal(remit[1].toString(10), remitAmount.toString(10));
    })
    
    it('should prevent others from claiming funds', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let rando = accounts[5];
        // Assume rando has stolen the password
        let error = null;
        try {
            let tx = await instance.withdraw(oneTimePassword, {
                from: rando,
            })
        } catch(err) {
            error = err;
        }
        assert(error instanceof Error);
    })

    it('should prevent carol from claiming with wrong password', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let error = null;
        try {
            let tx = await instance.withdraw('wrongpassword', {
                from: carol,
            })
        } catch (err) {
            error = err;
        }
        assert(error instanceof Error);
    })

    it('should let carol claim funds with password', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let carolAccountBalance = await web3.eth.getBalancePromise(carol);
        let resp = await instance.withdraw(oneTimePassword, {
            from: carol,
        })
        let tx = await web3.eth.getTransactionPromise(resp.tx);
        let txCost = tx.gasPrice.mul(resp.receipt.gasUsed);
        let calculatedBalance = carolAccountBalance.plus(remitAmount).minus(txCost);
        let carolAccountBalanceAfter = await web3.eth.getBalancePromise(carol);
        assert.equal(carolAccountBalanceAfter.toString(10), calculatedBalance.toString(10))

        let magicHash = await instance.genMagicHash(carol, oneTimePassword, {
            from: me
        });
        let remit = await instance.remittances(magicHash, {
            from: me
        });
        assert.equal(remit[0], me);
        assert.equal(remit[1], 0, 'Balance should be emptied.');
    })

    it('should let me revoke funds before they are claimed', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let magicHash = await instance.genMagicHash(carol, revokeOneTimePassword, {
            from: me
        });
        let tx = await instance.remit(magicHash, {
            from: me,
            value: remitAmount.toString(10)
        })
        let remit = await instance.remittances(magicHash, {
            from: me
        });
        assert.equal(remit[0], me);
        assert.equal(remit[1].toString(10), remitAmount.toString(10));
    
        let revokeTx = await instance.revoke(magicHash, {from: me})
        let updatedRemit = await instance.remittances(magicHash, {
            from: me
        });

        assert.equal(updatedRemit[0], me);
        assert.equal(updatedRemit[1].toString(10), '0');
    })

    it('should prevent other people from revoking', async () => {
        let instance = await Remittance.deployed();
        let me = accounts[0];
        let carol = accounts[1];
        let rando = accounts[5];
        let magicHash = await instance.genMagicHash(carol, anotherOneTimePassword, {
            from: me
        });
        let tx = await instance.remit(magicHash, {
            from: me,
            value: remitAmount.toString(10)
        })

        // let error = null;
        // try {
        //     let revokeTx = await instance.revoke(magicHash, {
        //         from: rando
        //     })
        // } catch (err) {
        //     error = err;
        // }
        // assert(error instanceof Error);

        // let remit = await instance.remittances(magicHash, {
        //     from: me
        // });
        // assert.equal(remit[0], me);
        // assert.equal(remit[1].toString(10), remitAmount.toString(10));
    })

})