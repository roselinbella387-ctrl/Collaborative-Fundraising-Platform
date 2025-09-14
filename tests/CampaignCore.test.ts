import { describe, it, expect, beforeEach } from "vitest";
import { stringUtf8CV, uintCV } from "@stacks/transactions";
const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_GOAL = 101;
const ERR_INVALID_DEADLINE = 102;
const ERR_INVALID_CONTRIB_AMOUNT = 103;
const ERR_CAMPAIGN_NOT_ACTIVE = 104;
const ERR_CAMPAIGN_EXPIRED = 105;
const ERR_CAMPAIGN_ALREADY_EXISTS = 106;
const ERR_CAMPAIGN_NOT_FOUND = 107;
const ERR_INVALID_CAMPAIGN_TYPE = 115;
const ERR_INVALID_RECIPIENT = 116;
const ERR_INVALID_DESCRIPTION = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_CONTRIB = 110;
const ERR_INVALID_MAX_CONTRIB = 111;
const ERR_MAX_CAMPAIGNS_EXCEEDED = 114;
const ERR_INVALID_UPDATE_PARAM = 113;
const ERR_AUTHORITY_NOT_VERIFIED = 109;
interface Campaign {
  name: string;
  goal: number;
  raised: number;
  deadline: number;
  minContrib: number;
  maxContrib: number;
  timestamp: number;
  creator: string;
  campaignType: string;
  recipient: string;
  description: string;
  location: string;
  currency: string;
  status: boolean;
}
interface CampaignUpdate {
  updateName: string;
  updateGoal: number;
  updateDeadline: number;
  updateTimestamp: number;
  updater: string;
}
interface Result<T> {
  ok: boolean;
  value: T;
}
class CampaignCoreMock {
  state: {
    nextCampaignId: number;
    maxCampaigns: number;
    creationFee: number;
    authorityContract: string | null;
    campaigns: Map<number, Campaign>;
    campaignUpdates: Map<number, CampaignUpdate>;
    campaignsByName: Map<string, number>;
    contributions: Map<string, number>;
  } = {
    nextCampaignId: 0,
    maxCampaigns: 1000,
    creationFee: 1000,
    authorityContract: null,
    campaigns: new Map(),
    campaignUpdates: new Map(),
    campaignsByName: new Map(),
    contributions: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];
  constructor() {
    this.reset();
  }
  reset() {
    this.state = {
      nextCampaignId: 0,
      maxCampaigns: 1000,
      creationFee: 1000,
      authorityContract: null,
      campaigns: new Map(),
      campaignUpdates: new Map(),
      campaignsByName: new Map(),
      contributions: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }
  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (contractPrincipal === "SP000000000000000000002Q6VF78") {
      return { ok: false, value: false };
    }
    if (this.state.authorityContract !== null) {
      return { ok: false, value: false };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }
  setCreationFee(newFee: number): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: false };
    this.state.creationFee = newFee;
    return { ok: true, value: true };
  }
  createCampaign(
    name: string,
    goal: number,
    deadline: number,
    minContrib: number,
    maxContrib: number,
    campaignType: string,
    recipient: string,
    description: string,
    location: string,
    currency: string
  ): Result<number> {
    if (this.state.nextCampaignId >= this.state.maxCampaigns) return { ok: false, value: ERR_MAX_CAMPAIGNS_EXCEEDED };
    if (!name || name.length > 100) return { ok: false, value: ERR_INVALID_UPDATE_PARAM };
    if (goal <= 0) return { ok: false, value: ERR_INVALID_GOAL };
    if (deadline <= this.blockHeight) return { ok: false, value: ERR_INVALID_DEADLINE };
    if (minContrib <= 0) return { ok: false, value: ERR_INVALID_MIN_CONTRIB };
    if (maxContrib <= 0) return { ok: false, value: ERR_INVALID_MAX_CONTRIB };
    if (!["charity", "project", "community"].includes(campaignType)) return { ok: false, value: ERR_INVALID_CAMPAIGN_TYPE };
    if (recipient === this.caller) return { ok: false, value: ERR_INVALID_RECIPIENT };
    if (!description || description.length > 500) return { ok: false, value: ERR_INVALID_DESCRIPTION };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (this.state.campaignsByName.has(name)) return { ok: false, value: ERR_CAMPAIGN_ALREADY_EXISTS };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_VERIFIED };
    this.stxTransfers.push({ amount: this.state.creationFee, from: this.caller, to: this.state.authorityContract });
    const id = this.state.nextCampaignId;
    const campaign: Campaign = {
      name,
      goal,
      raised: 0,
      deadline,
      minContrib,
      maxContrib,
      timestamp: this.blockHeight,
      creator: this.caller,
      campaignType,
      recipient,
      description,
      location,
      currency,
      status: true,
    };
    this.state.campaigns.set(id, campaign);
    this.state.campaignsByName.set(name, id);
    this.state.nextCampaignId++;
    return { ok: true, value: id };
  }
  contribute(campaignId: number, amount: number): Result<boolean> {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: false };
    if (!campaign.status) return { ok: false, value: false };
    if (this.blockHeight >= campaign.deadline) return { ok: false, value: false };
    if (amount < campaign.minContrib || amount > campaign.maxContrib) return { ok: false, value: false };
    this.stxTransfers.push({ amount, from: this.caller, to: "contract" });
    campaign.raised += amount;
    const key = `${campaignId}-${this.caller}`;
    const currentContrib = this.state.contributions.get(key) || 0;
    this.state.contributions.set(key, currentContrib + amount);
    return { ok: true, value: true };
  }
  releaseFunds(campaignId: number): Result<boolean> {
    const campaign = this.state.campaigns.get(campaignId);
    if (!campaign) return { ok: false, value: false };
    if (this.caller !== campaign.creator) return { ok: false, value: false };
    if (!campaign.status) return { ok: false, value: false };
    if (campaign.raised < campaign.goal) return { ok: false, value: false };
    this.stxTransfers.push({ amount: campaign.raised, from: "contract", to: campaign.recipient });
    campaign.status = false;
    return { ok: true, value: true };
  }
  getCampaign(id: number): Campaign | null {
    return this.state.campaigns.get(id) || null;
  }
  updateCampaign(id: number, updateName: string, updateGoal: number, updateDeadline: number): Result<boolean> {
    const campaign = this.state.campaigns.get(id);
    if (!campaign) return { ok: false, value: false };
    if (campaign.creator !== this.caller) return { ok: false, value: false };
    if (!updateName || updateName.length > 100) return { ok: false, value: false };
    if (updateGoal <= 0) return { ok: false, value: false };
    if (updateDeadline <= this.blockHeight) return { ok: false, value: false };
    if (this.state.campaignsByName.has(updateName) && this.state.campaignsByName.get(updateName) !== id) {
      return { ok: false, value: false };
    }
    const updated: Campaign = {
      ...campaign,
      name: updateName,
      goal: updateGoal,
      deadline: updateDeadline,
      timestamp: this.blockHeight,
    };
    this.state.campaigns.set(id, updated);
    this.state.campaignsByName.delete(campaign.name);
    this.state.campaignsByName.set(updateName, id);
    this.state.campaignUpdates.set(id, {
      updateName,
      updateGoal,
      updateDeadline,
      updateTimestamp: this.blockHeight,
      updater: this.caller,
    });
    return { ok: true, value: true };
  }
  getCampaignCount(): Result<number> {
    return { ok: true, value: this.state.nextCampaignId };
  }
  checkCampaignExistence(name: string): Result<boolean> {
    return { ok: true, value: this.state.campaignsByName.has(name) };
  }
}
describe("CampaignCore", () => {
  let contract: CampaignCoreMock;
  beforeEach(() => {
    contract = new CampaignCoreMock();
    contract.reset();
  });
  it("creates a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "Alpha",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const campaign = contract.getCampaign(0);
    expect(campaign?.name).toBe("Alpha");
    expect(campaign?.goal).toBe(1000);
    expect(campaign?.minContrib).toBe(10);
    expect(campaign?.maxContrib).toBe(500);
    expect(campaign?.campaignType).toBe("charity");
    expect(campaign?.recipient).toBe("ST3RECIP");
    expect(campaign?.description).toBe("Help the needy");
    expect(campaign?.location).toBe("CityX");
    expect(campaign?.currency).toBe("STX");
    expect(contract.stxTransfers).toEqual([{ amount: 1000, from: "ST1TEST", to: "ST2TEST" }]);
  });
  it("rejects duplicate campaign names", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Alpha",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.createCampaign(
      "Alpha",
      2000,
      200,
      20,
      1000,
      "project",
      "ST4RECIP",
      "Build a park",
      "CityY",
      "USD"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_CAMPAIGN_ALREADY_EXISTS);
  });
  it("rejects campaign creation without authority contract", () => {
    const result = contract.createCampaign(
      "NoAuth",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_AUTHORITY_NOT_VERIFIED);
  });
  it("rejects invalid goal", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "InvalidGoal",
      0,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_GOAL);
  });
  it("rejects invalid campaign type", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "InvalidType",
      1000,
      100,
      10,
      500,
      "invalid",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_CAMPAIGN_TYPE);
  });
  it("contributes successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.contribute(0, 100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.raised).toBe(100);
    expect(contract.stxTransfers.length).toBe(2);
  });
  it("rejects contribution to non-existent campaign", () => {
    const result = contract.contribute(99, 100);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
  it("rejects contribution below min", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.contribute(0, 5);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
  it("releases funds successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    contract.contribute(0, 500);
    contract.contribute(0, 500);
    const result = contract.releaseFunds(0);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.status).toBe(false);
    expect(contract.stxTransfers.length).toBe(4);
  });
  it("rejects release by non-creator", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    contract.contribute(0, 1000);
    contract.caller = "ST3FAKE";
    const result = contract.releaseFunds(0);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
  it("updates a campaign successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "OldCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.updateCampaign(0, "NewCampaign", 2000, 200);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const campaign = contract.getCampaign(0);
    expect(campaign?.name).toBe("NewCampaign");
    expect(campaign?.goal).toBe(2000);
    expect(campaign?.deadline).toBe(200);
    const update = contract.state.campaignUpdates.get(0);
    expect(update?.updateName).toBe("NewCampaign");
    expect(update?.updateGoal).toBe(2000);
    expect(update?.updateDeadline).toBe(200);
    expect(update?.updater).toBe("ST1TEST");
  });
  it("rejects update for non-existent campaign", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateCampaign(99, "NewCampaign", 2000, 200);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
  it("sets creation fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setCreationFee(2000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.creationFee).toBe(2000);
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(contract.stxTransfers).toEqual([{ amount: 2000, from: "ST1TEST", to: "ST2TEST" }]);
  });
  it("returns correct campaign count", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "Campaign1",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    contract.createCampaign(
      "Campaign2",
      2000,
      200,
      20,
      1000,
      "project",
      "ST4RECIP",
      "Build a park",
      "CityY",
      "USD"
    );
    const result = contract.getCampaignCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });
  it("checks campaign existence correctly", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.createCampaign(
      "TestCampaign",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.checkCampaignExistence("TestCampaign");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const result2 = contract.checkCampaignExistence("NonExistent");
    expect(result2.ok).toBe(true);
    expect(result2.value).toBe(false);
  });
  it("rejects campaign creation with empty name", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.createCampaign(
      "",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_UPDATE_PARAM);
  });
  it("rejects campaign creation with max campaigns exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxCampaigns = 1;
    contract.createCampaign(
      "Campaign1",
      1000,
      100,
      10,
      500,
      "charity",
      "ST3RECIP",
      "Help the needy",
      "CityX",
      "STX"
    );
    const result = contract.createCampaign(
      "Campaign2",
      2000,
      200,
      20,
      1000,
      "project",
      "ST4RECIP",
      "Build a park",
      "CityY",
      "USD"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_CAMPAIGNS_EXCEEDED);
  });
  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });
  it("rejects invalid authority contract", () => {
    const result = contract.setAuthorityContract("SP000000000000000000002Q6VF78");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(false);
  });
});