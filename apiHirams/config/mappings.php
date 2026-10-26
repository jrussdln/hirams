<?php
return [
    'status_user' => [
        'A' => 'Active',
        'I' => 'Inactive',
        'P' => 'For Approval',
    ],
    // 'user_types' => [
    //     'A' => 'Account Officer', //0
    //     'M' => 'Management', //1
    //     'F' => 'Finance Officer', //2
    //     'P' => 'Procurement Officer', //3
    //     'G' => 'General Manager', //4
    //     'X' => 'Account Officer TL', //5
    //     'Y' => 'Procurement Officer TL', //6
    // ],
    'user_types' => [
        'M' => 'Management', //0
        'G' => 'General Manager', //1
        'P' => 'Procurement Officer', //2
        'Y' => 'Procurement Officer TL', //3
        'A' => 'Account Officer', //4
        'X' => 'Account Officer TL', //5
        'F' => 'Finance Officer', //6
    ],
    'default_user_type' => [
        'V' => 'User', //0
    ],
    'sex' => [
        'M' => 'Male',
        'F' => 'Female',
    ],
    'vat' => [
        1 => 'VAT',
        0 => 'NVAT',
    ],
    'ewt' => [
        1 => 'EWT',
        0 => 'N/A',
    ],
    // EWT bypass type — a per-line override of the DEFAULT EWT formula
    // (see App\Helpers\FormulaHelper::calculateEWT).
    //   Q = Qty x UnitPrice
    //   A => Q x 0%              → 0.00 (no withholding on this line)
    //   B => Q x 1%              → gross x 1%
    //   C => Q x 2%              → gross x 2%
    //   D => (Q / 1.12) x 1%     → net-of-VAT x 1%
    'ewt_bypass_type' => [
        'A' => '0% of Q',
        'B' => '1% of Q',
        'C' => '2% of Q',
        'D' => '1% of Q / 1.12 (VAT net)',
    ],
    'proc_source' => [
        'P' => 'PhilGEPS',
        'W' => 'Walk-in',
        'R' => 'Referral',
        'O' => 'Online',
    ],
    'item_type' => [
        'G' => 'Goods',
        'S' => 'Service'
    ],
    'proc_mode' => [
        'R' => 'RFQ',
        'B' => 'Bidding',
        'E' => 'Emergency Procurement',
        'N' => 'Negotiated Procurement'
    ],
    'status_client' => [
        'A' => 'Active',
        'I' => 'Inactive',
        'P' => 'For Approval'
    ],
    'archive_status' => [
        '101' => 'Archived', //0
        '102' => 'Lost', //0
        '103' => 'Transaction Completed', //0

    ],
    'status_transaction' => [
        '100' => 'Create Transaction', //0
        '110' => 'Transaction Verification', //1
        '200' => 'Assign Transaction', //2
        '210' => 'Transaction Items Management', //3
        '220' => 'Transaciton Items Verification', //4
        '230' => 'Canvasing', //5
        '240' => 'Canvas Verification', //6
        '300' => 'Price Management', //7
        '310' => 'Price Verification', //8
        '320' => 'Price Approval', //9
        '330' => 'Awaiting Award', //10
        '340' => 'For Purchase/Delivery', //11
        '350' => 'For Collection' //11
    ],

    'transaction_filter_content' => [ //this is filters of management
        '100' => 'Draft', //it filters and fetch all transactions that code = 100 and the created_by is equal to the current nUserID show Finalize Button else show Force Finalize, and displays count
        '110' => 'Transaction Verification', //it filters and  fetch all transactions that code = 110 (display also here the transaction if created by is equal to the current nUserID),and displays count
        '200' => 'For Assignment', //it filters and fetch all transactions that code = 200, 210, 220, 230, 240 and displays count
        '210' => 'Items Management', //it filters and fetch all transactions that code = 210 and displays count
        '220' => 'Items Verification', //it filters and fetch all transactions that code = 220 and displays count
        '230' => 'For Canvas', //it filters and fetch all transactions that code = 230 and the created_by is equal to the current nUserID, and displays countas
        '240' => 'Canvas Verification', //it filters and fetch all transactions that code = 240 and displays count
        '300' => 'Price Setting', //it filters and fetch all transactions that code = 300 and the created_by is equal to the current nUserID show Finalize Button else show Force Finalize, and displays count
        '310' => 'Price Verification', //it filters and fetch all transactions that code = 310 (display also here the transaction if created by is equal to the current nUserID), and displays count
        '320' => 'Price Approval', //it filters and fetch all transactions that code = 320 and displays count
        '330' => 'Awaiting Award', //10
        '340' => 'For Purchase/Delivery', //11
        '350' => 'For Collection' //12
    ],
    'proc_status' => [ //this is for procurement - procurement team leader-
        '100' => 'Draft', //it filters and fetch transactions that code = 100 the created_by is equal to the current nUserID, and displays count
        '110' => 'Transaction Finalized', //it filters and fetch transactions that code = 110 and the created_by is equal to the current nUserID, and displays count
        '115' => 'Transaction Verification', //it filters and fetch transactions that code = 115 and the created_by is not equal to the current nUserID, and displays count
        '300' => 'Price Setting', //it filters and fetch transactions that code = 300 the created_by is equal to the current nUserID, and displays count
        '310' => 'Price Finalized', //it filters and fetch transactions that code = 310 and the created_by is equal to the current nUserID, and displays count
        '315' => 'Price Verification', //it filters and fetch transactions that code = 315 and the created_by is not equal to the current nUserID, and displays count
        '320' => 'Price Approval', //it filters and fetch transactions that code = 320 the created_by is equal to the current nUserID, and displays count
        '330' => 'Awaiting Award', //7
        '340' => 'For Purchase/Delivery', //8
    ],
    'ao_status' => [ // this is for account officer
        '210' => 'Items Management', //it filters and fetch transactions that code = 210 the created_by is equal to the current nUserID, and displays count
        '220' => 'Items Finalized', //it filters and fetch transactions that code = 220 and the created_by is equal to the current nUserID, and displays count
        '225' => 'Items Verification', //it filters and fetch transactions that code = 225 and the created_by is not equal to the current nUserID, and displays count
        '230' => 'For Canvas', //it filters and fetch transactions that code = 230 the created_by is equal to the current nUserID, and displays count
        '240' => 'Canvas Finalized', //it filters and fetch transactions that code = 240 and the created_by is equal to the current nUserID, and displays count
        '245' => 'Canvas Verification', //it filters and fetch transactions that code = 245 and the created_by is not equal to the current nUserID, and displays count
        '340' => 'For Purchase/Delivery', //it filters and fetch transactions that code = 340 the created_by is equal to the current nUserID, and displays count

    ],
    'aotl_status' => [ //this is for account officer team leader
        '200' => 'For Assignment', //it filters and fetch all transactions that code = 200, 210, 220, 225, 230, 240, 245 and displays count
        '210' => 'Items Management', //it filters and fetch transactions that code = 210 the created_by is equal to the current nUserID, and displays count
        '220' => 'Items Finalized', //it filters and fetch transactions that code = 220 and the created_by is equal to the current nUserID, and displays count
        '225' => 'Items Verification', //it filters and fetch transactions that code = 225 and the created_by is not equal to the current nUserID, and displays count
        '230' => 'For Canvas', //it filters and fetch transactions that code = 230 the created_by is equal to the current nUserID, and displays count
        '240' => 'Canvas Finalized', //it filters and fetch transactions that code = 240 and the created_by is equal to the current nUserID, and displays count
        '245' => 'Canvas Verification', //it filters and fetch transactions that code = 245 and the created_by is not equal to the current nUserID, and displays count
        '340' => 'For Purchase/Delivery', //it filters and fetch transactions that code = 340 the created_by is equal to the current nUserID, and displays count
    ],
    'finance_status' => [ //this is for finance officer
        '350' => 'For Collection', //it filters and fetch all transactions that code = 200, 210, 220, 225, 230, 240, 245 and displays count

    ],
    'vaGoSeValue' => [
        '1.12' => 'Vat',
        '0.01' => '1%',
        '0.02' => '2%',
    ],
    'for_purchase_status' => [ //this will be removed 

        '110' => 'Added to Cart', //1
        '120' => 'Purchase Order', //2
        '130' => 'Paid', //3
        '140' => 'Received', //4
        '150' => 'Delivered', //5   
        '160' => 'Removed from Cart',
        '100' => 'Cancelled', //0
    ],
    'cart_status' => [ //this will be removed 
        'O' => 'Open', //0
        'C' => 'Closed', //1
        'X' => 'Cancelled', //2/
    ],
    'item_purchasing_status' => [
        '110' => 'Cart',              // Open Cart
        '120' => 'For Approval',      // Closed Cart → PO created
        '130' => 'For Payment',       // Closed PO → Paid
        '140' => 'Pending Receipt',   // Closed Paid → Received
        '150' => 'For Delivery',      // Closed Received → Delivering
        '160' => 'Delivered',         // Closed Delivered
        '170' => 'Cancelled',         // Cancelled
    ],
    'item_purchasing_status_finance' => [

        '120' => 'For Approval',      // Closed Cart → PO created
        '130' => 'For Payment',       // Closed PO → Paid
        '170' => 'Cancelled',         // Cancelled
    ],
    'removed_from_cart_status' => [ //this is the new mapping for removed from cart 
        '100' => 'Removed from Cart', //0
    ],
    'voucher_status' => [
        'A' => 'Active', //0
        'C' => 'Closed', //1
        'P' => 'Paid',
        'X' => 'Cancelled', //
    ],
    'voucher_type' => [
        'S' => 'Supplier', //0
        'A' => 'Assignee', //
    ],
    'shipping_method' => [
        'P' => 'Pick-up',
        'D' => 'Deliver'
    ],
    'payment_terms' => [
        'N' => 'Online',
        'C' => 'Cash',
        'A' => 'Credit Card',
        'Q' => 'Cheque/PDC',
        'O'  => 'Others',
    ],
    'inventory_status' => [
        'S' => 'For Delivery',
        'D' => 'Delivered',
        'P' => 'Pending JEV',
        'C' => 'Cancelled'

    ],
    'inventory_status_ao_proc' => [
        'S' => 'For Delivery',
        'D' => 'Delivered',
        'C' => 'Cancelled'
    ],
    'jev_types' => [
        'V' => 'Disbursement Voucher', //DV
        'R' => 'Received Purchases', //Received Items
        'D' => 'Delivered Items', //Deivery Receipt
        'C' => 'Collection', //Collection Receipt
        'N' => 'Other JEV'
    ],
    'jev_status' => [
        'A' => 'Active', //0
        'C' => 'Cancelled', //1
        'P' => 'Pending', //
    ],
    'unit_price_status' => [
        'A' => 'Active', //0
        'P' => 'Pending', //
        'C' => 'Cancelled', //1
    ],
];
