# 🌍 Collaborative Fundraising Platform

Welcome to a decentralized, transparent fundraising platform built on the Stacks blockchain using Clarity smart contracts! This Web3 project addresses the real-world problem of trust and transparency in collaborative fundraising by enabling communities to create, contribute to, and manage campaigns with shared goals, ensuring funds are used as intended.

## ✨ Features
- **Collaborative Campaigns**: Create campaigns with multiple organizers who share decision-making power.
- **Transparent Fund Allocation**: Funds are locked in smart contracts until milestones are met or voting thresholds are achieved.
- **Immutable Contribution Tracking**: All contributions are recorded on-chain for full transparency.
- **Milestone-Based Fund Release**: Funds are released only when predefined goals are verified.
- **Refund Mechanism**: Contributors can reclaim funds if a campaign fails to meet its goals by the deadline.
- **Decentralized Voting**: Organizers vote on key decisions, such as fund releases or campaign cancellation.
- **Public Auditability**: Anyone can verify campaign details, contributions, and outcomes on the blockchain.

## 🛠 How It Works
### For Organizers
1. **Create a Campaign**: Deploy a campaign with a funding goal, deadline, and milestones using `create-campaign`.
2. **Invite Co-Organizers**: Add trusted collaborators to share governance via `add-organizer`.
3. **Define Milestones**: Set verifiable milestones that trigger fund releases using `set-milestone`.
4. **Vote on Actions**: Use `vote-on-release` or `vote-on-cancel` to approve fund releases or campaign termination.
5. **Complete Campaign**: Once milestones are met, funds are released to the designated recipient with `release-funds`.

### For Contributors
1. **Browse Campaigns**: View campaign details (goal, deadline, milestones) using `get-campaign-details`.
2. **Contribute Funds**: Send STX to a campaign using `contribute`.
3. **Track Progress**: Monitor milestones and fund usage via `get-milestone-status`.
4. **Request Refund**: If a campaign fails, claim a refund using `claim-refunded`.

### For Verifiers
- **Audit Campaigns**: Use `get-campaign-details` and `get-contributions` to verify campaign transparency.
- **Check Voting**: View organizer votes on fund releases or cancellations with `get-vote-status`.

## 📜 Smart Contracts
This project uses 8 Clarity smart contracts to power the platform:

1. **CampaignFactory**: Creates new campaigns and tracks all active campaigns.
   - Functions: `create-campaign`, `get-campaign-list`
2. **CampaignCore**: Manages core campaign logic, including contributions and fund releases.
   - Functions: `contribute`, `release-funds`, `get-campaign-details`
3. **OrganizerRegistry**: Handles organizer registration and permissions.
   - Functions: `add-organizer`, `remove-organizer`, `get-organizers`
4. **MilestoneManager**: Defines and tracks campaign milestones.
   - Functions: `set-milestone`, `complete-milestone`, `get-milestone-status`
5. **VotingSystem**: Manages decentralized voting for fund releases and campaign decisions.
   - Functions: `vote-on-release`, `vote-on-cancel`, `get-vote-status`
6. **ContributionTracker**: Records and verifies all contributions.
   - Functions: `get-contributions`, `get-contributor-balance`
7. **RefundManager**: Handles refund logic for failed campaigns.
   - Functions: `claim-refunded`, `initiate-refunded`
8. **AuditLog**: Provides a public, immutable log of all campaign actions.
   - Functions: `log-action`, `get-audit-log`

## 🚀 Getting Started
1. **Deploy Contracts**: Deploy the contracts on the Stacks blockchain using the Clarity development environment.
2. **Create a Campaign**: Use the `CampaignFactory` contract to initialize a new campaign with a funding goal and deadline.
3. **Invite Organizers**: Add co-organizers via `OrganizerRegistry` to share governance.
4. **Contribute**: Contributors can send STX to the campaign using `CampaignCore`.
5. **Manage Milestones**: Set and complete milestones with `MilestoneManager`.
6. **Vote and Release**: Organizers vote on fund releases or campaign cancellation using `VotingSystem`.
7. **Audit and Verify**: Use `AuditLog` and other read-only functions to verify campaign integrity.

## 🛡️ Security Features
- **Multi-Signature Voting**: Requires a majority of organizers to approve fund releases.
- **Time-Locked Funds**: Funds are locked until deadlines or milestones are met.
- **Immutable Audit Trail**: All actions are logged on-chain for transparency.
- **No Single Point of Failure**: Decentralized governance prevents misuse by any single organizer.

## 🌟 Why This Matters
This platform solves real-world issues in fundraising, such as lack of trust, mismanagement, and opaque fund usage. By leveraging the Stacks blockchain and Clarity smart contracts, it ensures:
- Donors can trust that funds are used as promised.
- Organizers collaborate transparently with shared accountability.
- Communities can rally around causes with verifiable outcomes.