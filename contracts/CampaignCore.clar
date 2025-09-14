(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-GOAL u101)
(define-constant ERR-INVALID-DEADLINE u102)
(define-constant ERR-INVALID-CONTRIB-AMOUNT u103)
(define-constant ERR-CAMPAIGN-NOT-ACTIVE u104)
(define-constant ERR-CAMPAIGN-EXPIRED u105)
(define-constant ERR-CAMPAIGN-ALREADY-EXISTS u106)
(define-constant ERR-CAMPAIGN-NOT-FOUND u107)
(define-constant ERR-INVALID-TIMESTAMP u108)
(define-constant ERR-AUTHORITY-NOT-VERIFIED u109)
(define-constant ERR-INVALID-MIN-CONTRIB u110)
(define-constant ERR-INVALID-MAX-CONTRIB u111)
(define-constant ERR-CAMPAIGN-UPDATE-NOT-ALLOWED u112)
(define-constant ERR-INVALID-UPDATE-PARAM u113)
(define-constant ERR-MAX-CAMPAIGNS-EXCEEDED u114)
(define-constant ERR-INVALID-CAMPAIGN-TYPE u115)
(define-constant ERR-INVALID-RECIPIENT u116)
(define-constant ERR-INVALID-DESCRIPTION u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-STATUS u120)
(define-data-var next-campaign-id uint u0)
(define-data-var max-campaigns uint u1000)
(define-data-var creation-fee uint u1000)
(define-data-var authority-contract (optional principal) none)
(define-map campaigns
  uint
  {
    name: (string-utf8 100),
    goal: uint,
    raised: uint,
    deadline: uint,
    min-contrib: uint,
    max-contrib: uint,
    timestamp: uint,
    creator: principal,
    campaign-type: (string-utf8 50),
    recipient: principal,
    description: (string-utf8 500),
    location: (string-utf8 100),
    currency: (string-utf8 20),
    status: bool
  }
)
(define-map campaigns-by-name
  (string-utf8 100)
  uint)
(define-map campaign-updates
  uint
  {
    update-name: (string-utf8 100),
    update-goal: uint,
    update-deadline: uint,
    update-timestamp: uint,
    updater: principal
  }
)
(define-map contributions
  { campaign-id: uint, contributor: principal }
  uint)
(define-read-only (get-campaign (id uint))
  (map-get? campaigns id)
)
(define-read-only (get-campaign-updates (id uint))
  (map-get? campaign-updates id)
)
(define-read-only (is-campaign-registered (name (string-utf8 100)))
  (is-some (map-get? campaigns-by-name name))
)
(define-read-only (get-contribution (campaign-id uint) (contributor principal))
  (default-to u0 (map-get? contributions { campaign-id: campaign-id, contributor: contributor }))
)
(define-private (validate-name (name (string-utf8 100)))
  (if (and (> (len name) u0) (<= (len name) u100))
      (ok true)
      (err ERR-INVALID-UPDATE-PARAM))
)
(define-private (validate-goal (goal uint))
  (if (> goal u0)
      (ok true)
      (err ERR-INVALID-GOAL))
)
(define-private (validate-deadline (deadline uint))
  (if (> deadline block-height)
      (ok true)
      (err ERR-INVALID-DEADLINE))
)
(define-private (validate-contrib-amount (amount uint) (min-contrib uint) (max-contrib uint))
  (if (and (>= amount min-contrib) (<= amount max-contrib))
      (ok true)
      (err ERR-INVALID-CONTRIB-AMOUNT))
)
(define-private (validate-min-contrib (min uint))
  (if (> min u0)
      (ok true)
      (err ERR-INVALID-MIN-CONTRIB))
)
(define-private (validate-max-contrib (max uint))
  (if (> max u0)
      (ok true)
      (err ERR-INVALID-MAX-CONTRIB))
)
(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)
(define-private (validate-campaign-type (type (string-utf8 50)))
  (if (or (is-eq type "charity") (is-eq type "project") (is-eq type "community"))
      (ok true)
      (err ERR-INVALID-CAMPAIGN-TYPE))
)
(define-private (validate-recipient (recipient principal))
  (if (not (is-eq recipient tx-sender))
      (ok true)
      (err ERR-INVALID-RECIPIENT))
)
(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR-INVALID-DESCRIPTION))
)
(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)
(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur "STX") (is-eq cur "USD") (is-eq cur "BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)
(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR-NOT-AUTHORIZED))
)
(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)
(define-public (set-max-campaigns (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR-MAX-CAMPAIGNS-EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set max-campaigns new-max)
    (ok true)
  )
)
(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR-INVALID-UPDATE-PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-VERIFIED))
    (var-set creation-fee new-fee)
    (ok true)
  )
)
(define-public (create-campaign
  (campaign-name (string-utf8 100))
  (goal uint)
  (deadline uint)
  (min-contrib uint)
  (max-contrib uint)
  (campaign-type (string-utf8 50))
  (recipient principal)
  (description (string-utf8 500))
  (location (string-utf8 100))
  (currency (string-utf8 20))
)
  (let (
        (next-id (var-get next-campaign-id))
        (current-max (var-get max-campaigns))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR-MAX-CAMPAIGNS-EXCEEDED))
    (try! (validate-name campaign-name))
    (try! (validate-goal goal))
    (try! (validate-deadline deadline))
    (try! (validate-min-contrib min-contrib))
    (try! (validate-max-contrib max-contrib))
    (try! (validate-campaign-type campaign-type))
    (try! (validate-recipient recipient))
    (try! (validate-description description))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (asserts! (is-none (map-get? campaigns-by-name campaign-name)) (err ERR-CAMPAIGN-ALREADY-EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR-AUTHORITY-NOT-VERIFIED))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-set campaigns next-id
      {
        name: campaign-name,
        goal: goal,
        raised: u0,
        deadline: deadline,
        min-contrib: min-contrib,
        max-contrib: max-contrib,
        timestamp: block-height,
        creator: tx-sender,
        campaign-type: campaign-type,
        recipient: recipient,
        description: description,
        location: location,
        currency: currency,
        status: true
      }
    )
    (map-set campaigns-by-name campaign-name next-id)
    (var-set next-campaign-id (+ next-id u1))
    (print { event: "campaign-created", id: next-id })
    (ok next-id)
  )
)
(define-public (contribute (campaign-id uint) (amount uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) (err ERR-CAMPAIGN-NOT-FOUND))))
    (asserts! (get status campaign) (err ERR-CAMPAIGN-NOT-ACTIVE))
    (asserts! (< block-height (get deadline campaign)) (err ERR-CAMPAIGN-EXPIRED))
    (try! (validate-contrib-amount amount (get min-contrib campaign) (get max-contrib campaign)))
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (let ((current-raised (get raised campaign))
          (current-contrib (get-contribution campaign-id tx-sender)))
      (map-set campaigns campaign-id
        (merge campaign { raised: (+ current-raised amount) }))
      (map-set contributions { campaign-id: campaign-id, contributor: tx-sender } (+ current-contrib amount))
      (print { event: "contribution-made", campaign-id: campaign-id, amount: amount, contributor: tx-sender })
      (ok true)
    )
  )
)
(define-public (release-funds (campaign-id uint))
  (let ((campaign (unwrap! (map-get? campaigns campaign-id) (err ERR-CAMPAIGN-NOT-FOUND))))
    (asserts! (is-eq tx-sender (get creator campaign)) (err ERR-NOT-AUTHORIZED))
    (asserts! (get status campaign) (err ERR-CAMPAIGN-NOT-ACTIVE))
    (asserts! (>= (get raised campaign) (get goal campaign)) (err ERR-INVALID-STATUS))
    (let ((raised (get raised campaign)))
      (try! (as-contract (stx-transfer? raised tx-sender (get recipient campaign))))
      (map-set campaigns campaign-id
        (merge campaign { status: false }))
      (print { event: "funds-released", campaign-id: campaign-id, amount: raised })
      (ok true)
    )
  )
)
(define-public (update-campaign
  (campaign-id uint)
  (update-name (string-utf8 100))
  (update-goal uint)
  (update-deadline uint)
)
  (let ((campaign (map-get? campaigns campaign-id)))
    (match campaign
      c
        (begin
          (asserts! (is-eq (get creator c) tx-sender) (err ERR-NOT-AUTHORIZED))
          (try! (validate-name update-name))
          (try! (validate-goal update-goal))
          (try! (validate-deadline update-deadline))
          (let ((existing (map-get? campaigns-by-name update-name)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id campaign-id) (err ERR-CAMPAIGN-ALREADY-EXISTS))
              (begin true)
            )
          )
          (let ((old-name (get name c)))
            (if (is-eq old-name update-name)
                (ok true)
                (begin
                  (map-delete campaigns-by-name old-name)
                  (map-set campaigns-by-name update-name campaign-id)
                  (ok true)
                )
            )
          )
          (map-set campaigns campaign-id
            {
              name: update-name,
              goal: update-goal,
              raised: (get raised c),
              deadline: update-deadline,
              min-contrib: (get min-contrib c),
              max-contrib: (get max-contrib c),
              timestamp: block-height,
              creator: (get creator c),
              campaign-type: (get campaign-type c),
              recipient: (get recipient c),
              description: (get description c),
              location: (get location c),
              currency: (get currency c),
              status: (get status c)
            }
          )
          (map-set campaign-updates campaign-id
            {
              update-name: update-name,
              update-goal: update-goal,
              update-deadline: update-deadline,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "campaign-updated", id: campaign-id })
          (ok true)
        )
      (err ERR-CAMPAIGN-NOT-FOUND)
    )
  )
)
(define-public (get-campaign-count)
  (ok (var-get next-campaign-id))
)
(define-public (check-campaign-existence (name (string-utf8 100)))
  (ok (is-campaign-registered name))
)