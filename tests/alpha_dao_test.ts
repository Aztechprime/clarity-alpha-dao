import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a proposal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("Description"),
                    types.uint(1000000),
                    types.principal(wallet1.address)
                ],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk().expectUint(0);
        
        // Verify proposal details
        let getProposal = chain.callReadOnlyFn(
            'alpha_dao',
            'get-proposal',
            [types.uint(0)],
            deployer.address
        );
        
        let proposal = getProposal.result.expectSome().expectTuple();
        assertEquals(proposal.title, "Test Proposal");
        assertEquals(proposal.status, "active");
    }
});

Clarinet.test({
    name: "Can delegate voting power",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        let block = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'delegate-to',
                [types.principal(wallet1.address)],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk();

        // Verify delegation
        let getDelegate = chain.callReadOnlyFn(
            'alpha_dao',
            'get-delegate',
            [types.principal(deployer.address)],
            deployer.address
        );

        getDelegate.result.expectSome().expectPrincipal(wallet1.address);
    }
});

Clarinet.test({
    name: "Can remove delegation",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        // Set up delegation
        chain.mineBlock([
            Tx.contractCall('alpha_dao', 'delegate-to',
                [types.principal(wallet1.address)],
                deployer.address
            )
        ]);

        // Remove delegation
        let block = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'remove-delegation',
                [],
                deployer.address
            )
        ]);

        block.receipts[0].result.expectOk();

        // Verify delegation removed
        let getDelegate = chain.callReadOnlyFn(
            'alpha_dao',
            'get-delegate',
            [types.principal(deployer.address)],
            deployer.address
        );

        getDelegate.result.expectNone();
    }
});

Clarinet.test({
    name: "Can vote with delegated power",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;
        const wallet2 = accounts.get('wallet_2')!;

        // Create proposal
        chain.mineBlock([
            Tx.contractCall('alpha_dao', 'create-proposal',
                [
                    types.ascii("Test Proposal"),
                    types.utf8("Description"),
                    types.uint(1000000),
                    types.principal(wallet1.address)
                ],
                deployer.address
            )
        ]);

        // Set up delegation
        chain.mineBlock([
            Tx.contractCall('alpha_dao', 'delegate-to',
                [types.principal(wallet2.address)],
                wallet1.address
            )
        ]);

        // Vote with delegated power
        let voteBlock = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'vote',
                [types.uint(0), types.bool(true)],
                wallet2.address
            )
        ]);

        voteBlock.receipts[0].result.expectOk().expectBool(true);

        // Verify vote power includes delegation
        let getProposal = chain.callReadOnlyFn(
            'alpha_dao',
            'get-proposal',
            [types.uint(0)],
            deployer.address
        );
        
        let proposal = getProposal.result.expectSome().expectTuple();
        assertEquals(proposal['votes-for'], '2000000'); // Combined balance
    }
});
