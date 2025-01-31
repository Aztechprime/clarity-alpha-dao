# AlphaDAO

A decentralized autonomous organization (DAO) for funding promising tech startups. Members can propose funding requests, vote on proposals, and receive rewards from successful investments.

## Features
- Membership management with governance tokens
- Proposal creation and voting system
- Vote delegation system
- Treasury management
- Investment tracking and reward distribution
- Configurable voting parameters

## Vote Delegation
Members can delegate their voting power to other members while retaining ownership of their tokens. Key features:
- Delegate voting rights to any other member
- Remove delegation at any time
- Prevents delegation cycles
- Delegated voting power is automatically included in vote calculations
- Delegates can vote with combined voting power

## Getting Started
1. Clone this repository
2. Install Clarinet
3. Run tests: `clarinet test`
4. Deploy contract

## Usage
### Delegating Votes
```clarity
(contract-call? .alpha-dao delegate-to DELEGATE_ADDRESS)
```

### Removing Delegation
```clarity
(contract-call? .alpha-dao remove-delegation)
```
