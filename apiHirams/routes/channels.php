<?php
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('transactions',                               fn() => true);
Broadcast::channel('users',                                      fn() => true);
Broadcast::channel('companies',                                  fn() => true);
Broadcast::channel('clients',                                    fn() => true);
Broadcast::channel('suppliers',                                  fn() => true);
Broadcast::channel('supplier-contacts',                          fn() => true);
Broadcast::channel('supplier-banks',                             fn() => true);
Broadcast::channel('direct-costs',                               fn() => true);
Broadcast::channel('transaction.{transactionId}.items',          fn() => true);
Broadcast::channel('transaction.{transactionId}.pricing-sets',   fn() => true);
Broadcast::channel('pricing-set.{pricingSetId}.item-pricings',   fn() => true);

Broadcast::channel('purchase-orders',                            fn() => true);
Broadcast::channel('purchase-order.{purchaseOrderId}.options',   fn() => true);
Broadcast::channel('purchase-order-options',                     fn() => true);
Broadcast::channel('assignees',                                  fn() => true);
Broadcast::channel('vouchers',                                   fn() => true);
Broadcast::channel('journal-accounts',                           fn() => true);
Broadcast::channel('jev-entries',                                fn() => true);
Broadcast::channel('jevs',                                       fn() => true);