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
    name: "Can vote on proposal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        // Create proposal
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

        // Vote
        let voteBlock = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'vote',
                [types.uint(0), types.bool(true)],
                deployer.address
            )
        ]);

        voteBlock.receipts[0].result.expectOk().expectBool(true);

        // Verify vote
        let getVote = chain.callReadOnlyFn(
            'alpha_dao',
            'get-vote',
            [types.uint(0), types.principal(deployer.address)],
            deployer.address
        );
        
        getVote.result.expectSome().expectBool(true);
    }
});

Clarinet.test({
    name: "Can execute passed proposal",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const wallet1 = accounts.get('wallet_1')!;

        // Create and vote on proposal
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

        chain.mineBlock([
            Tx.contractCall('alpha_dao', 'vote',
                [types.uint(0), types.bool(true)],
                deployer.address
            )
        ]);

        // Mine blocks to pass voting period
        chain.mineEmptyBlockUntil(200);

        // Execute proposal
        let executeBlock = chain.mineBlock([
            Tx.contractCall('alpha_dao', 'execute-proposal',
                [types.uint(0)],
                deployer.address
            )
        ]);

        executeBlock.receipts[0].result.expectOk().expectBool(true);

        // Verify proposal status
        let getProposal = chain.callReadOnlyFn(
            'alpha_dao',
            'get-proposal',
            [types.uint(0)],
            deployer.address
        );
        
        let proposal = getProposal.result.expectSome().expectTuple();
        assertEquals(proposal.status, "executed");
    }
});