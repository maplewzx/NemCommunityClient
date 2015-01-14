"use strict";

define(['NccModal', 'Utils'], function(NccModal, Utils) {
	return NccModal.extend({
        data: {
            isFeeAutofilled: true,
            dueBy: 12
        },
        computed: {
            hours_due: function() {
                return this.get('dueBy') | 0;
            },
            fee: {
                get: function() {
                    return Utils.format.nem.getNemValue(Utils.format.nem.stringToNem(this.get('formattedFee')));
                },
                set: function(fee) {
                    this.set('formattedFee', Utils.format.nem.formatNemAmount(fee));
                    this.update('fee'); // so that stupid Ractive trigger fee observers
                }
            },
            feeValid: function() {
                return this.get('fee') >= this.get('minimumFee');
            },
            feeError: function() {
                return !this.get('feeValid') && this.get('feeChanged');
            },
            formattedMinimumFee: function() {
                return Utils.format.nem.formatNemAmount(this.get('minimumFee'));
            },
            passwordValid: function() {
                return !!this.get('password');
            },
            passwordError: function() {
                return !this.get('passwordValid') && this.get('passwordChanged');
            },
            formValid: function() {
                return this.get('feeValid') && this.get('passwordValid');
            }
        },
        /**
         * @param {boolean} options.silent
         */
        resetFee: function(options) {
            var requestData = {
                wallet: ncc.get('wallet.wallet'),
                account: ncc.get('activeAccount.address'),
                hours_due: this.get('hours_due')
            };
            var self = this;
            
            ncc.postRequest('wallet/account/transaction/validate', requestData, 
                function(data) {
                    self.set('minimumFee', data.fee);
                },
                {
                    altFailCb: function(faultId, error) {
                    }
                }, options.silent
            );
        },
        validateTx: function() {
            return true;
        },
        resetDefaultData: function() {
            this.set('sender', Utils.format.address.format(ncc.get('activeAccount.address')));
            this.set('fee', 0);
            this.set('minimumFee', 0);
            this.set('dueBy', '12');
            this.set('password', '');
            this.set('useMinimumFee', true);

            this.set('feeChanged', false);
            this.set('passwordChanged', false);
            this.resetFee({ silent: true });
        },
        sendTransaction: function() {
            var requestData = {
                wallet: ncc.get('wallet.wallet'),
                account: ncc.get('activeAccount.address'),
                password: this.get('password'),
                fee: this.get('fee'),
                hours_due: this.get('hours_due')
            };

            var txConfirm = ncc.getModal('transactionConfirm');
            txConfirm.set('txData', this.get());
            txConfirm.set('requestData', requestData);
            txConfirm.open();
        },
        onrender: function() {
            this._super();
            var self = this;

            this.resetDefaultData();

            this.observe({
                useMinimumFee: function(useMinimumFee) {
                    if (useMinimumFee) {
                        this.set('fee', this.get('minimumFee'));
                    }
                },
                minimumFee: function(minimumFee) {
                    if (this.get('useMinimumFee')) {
                        this.set('fee', minimumFee);
                    }
                }
            });

            this.observe({
                fee: function() {
                    this.set('feeChanged', true);
                },
                password: function() {
                    this.set('passwordChanged', true);
                }
            }, 
            {
                init: false
            });

            this.on({
                sendFormKeypress: function(e) {
                    if (e.original.keyCode === 13 && this.get('formValid')) {
                        this.sendTransaction();
                    }
                },
                modalOpened: function() {
                    $('.js-sendNem-recipient-textbox').focus();
                    // TODO G-Krysto: this should be here not in modalClosed, or not?
                    this.resetDefaultData();
                },
                modalClosed: function() {
                    this.resetDefaultData();
                }
            });

            var $dueBy = $('.js-sendNem-dueBy-textbox');
            $dueBy.on('keypress', function(e) { Utils.mask.keypress(e, 'number', self) });

            var $fee = $('.js-sendNem-fee-textbox');
            var feeTxb = $fee[0];
            $fee.on('keypress', function(e) { Utils.mask.keypress(e, 'nem', self); });
            $fee.on('paste', function(e) { Utils.mask.paste(e, 'nem', self); });
            $fee.on('keydown', function(e) { Utils.mask.keydown(e, 'nem', self); });

            this.listeners.push(ncc.observe({
                'texts.preferences.thousandSeparator': function(newProp, oldProp) {
                    feeTxb.value = Utils.format.nem.reformat(feeTxb.value, oldProp, newProp);
                },
                'texts.preferences.decimalSeparator': function(newProp, oldProp) {
                    feeTxb.value = Utils.format.nem.reformat(feeTxb.value, null, null, oldProp, newProp);
                }
            }));
        }
    });
});