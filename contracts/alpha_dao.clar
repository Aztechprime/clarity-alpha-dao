;; AlphaDAO Contract
;; Governance token
(define-fungible-token dao-token)

;; Constants
(define-constant contract-owner tx-sender)
(define-constant min-proposal-amount u1000000) ;; 1M uSTX
(define-constant voting-period u144) ;; ~1 day in blocks
(define-constant quorum-threshold u51) ;; 51%

;; Errors
(define-constant err-not-authorized (err u100))
(define-constant err-invalid-amount (err u101))
(define-constant err-proposal-not-found (err u102))
(define-constant err-proposal-expired (err u103))
(define-constant err-already-voted (err u104))

;; Proposal status
(define-data-var proposal-count uint u0)

;; Data structures
(define-map proposals
    uint
    {
        creator: principal,
        title: (string-ascii 100),
        description: (string-utf8 1000),
        amount: uint,
        recipient: principal,
        votes-for: uint,
        votes-against: uint,
        status: (string-ascii 20),
        end-block: uint
    }
)

(define-map votes
    {proposal-id: uint, voter: principal}
    bool
)

;; Initialize contract
(begin
    (try! (ft-mint? dao-token u1000000 contract-owner))
)

;; Create a new proposal
(define-public (create-proposal (title (string-ascii 100)) (description (string-utf8 1000)) (amount uint) (recipient principal))
    (let
        (
            (proposal-id (var-get proposal-count))
            (end-block (+ block-height voting-period))
        )
        (asserts! (>= amount min-proposal-amount) err-invalid-amount)
        (map-set proposals proposal-id
            {
                creator: tx-sender,
                title: title,
                description: description,
                amount: amount,
                recipient: recipient,
                votes-for: u0,
                votes-against: u0,
                status: "active",
                end-block: end-block
            }
        )
        (var-set proposal-count (+ proposal-id u1))
        (ok proposal-id)
    )
)

;; Vote on a proposal
(define-public (vote (proposal-id uint) (vote-for bool))
    (let
        (
            (proposal (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
            (voter-balance (ft-get-balance dao-token tx-sender))
        )
        (asserts! (not (is-some (map-get? votes {proposal-id: proposal-id, voter: tx-sender}))) err-already-voted)
        (asserts! (< block-height (get end-block proposal)) err-proposal-expired)
        
        (map-set votes {proposal-id: proposal-id, voter: tx-sender} vote-for)
        
        (if vote-for
            (map-set proposals proposal-id (merge proposal {votes-for: (+ (get votes-for proposal) voter-balance)}))
            (map-set proposals proposal-id (merge proposal {votes-against: (+ (get votes-against proposal) voter-balance)}))
        )
        (ok true)
    )
)

;; Execute a proposal
(define-public (execute-proposal (proposal-id uint))
    (let
        (
            (proposal (unwrap! (map-get? proposals proposal-id) err-proposal-not-found))
            (total-votes (+ (get votes-for proposal) (get votes-against proposal)))
            (total-supply (ft-get-supply dao-token))
        )
        (asserts! (> block-height (get end-block proposal)) err-proposal-expired)
        (asserts! (is-eq (get status proposal) "active") err-proposal-not-found)
        (asserts! (>= (* total-votes u100) (* total-supply quorum-threshold)) err-invalid-amount)
        
        (if (> (get votes-for proposal) (get votes-against proposal))
            (begin
                (try! (stx-transfer? (get amount proposal) contract-owner (get recipient proposal)))
                (map-set proposals proposal-id (merge proposal {status: "executed"}))
                (ok true)
            )
            (begin
                (map-set proposals proposal-id (merge proposal {status: "rejected"}))
                (ok false)
            )
        )
    )
)

;; Read only functions
(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals proposal-id)
)

(define-read-only (get-vote (proposal-id uint) (voter principal))
    (map-get? votes {proposal-id: proposal-id, voter: voter})
)

(define-read-only (get-member-balance (member principal))
    (ok (ft-get-balance dao-token member))
)