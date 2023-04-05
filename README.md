# sequence relayer claim example

This example uses an express nodejs backend to relay signatures to a contract broadcasted using the sequence relayer to claim joy tokens based on nonce-based actions completed in a game.

## steps to run

```
// open terminal #1
$ mv .env.example .env // and update values with private key and sequence wallet
$ yarn
$ yarn start

// open terminal #2
$ yarn
$ yarn test
```
