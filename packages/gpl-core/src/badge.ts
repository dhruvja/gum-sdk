import { SDK } from ".";
import { gql } from "graphql-request";
import * as anchor from "@project-serum/anchor";
import randomBytes from "randombytes";

export interface GraphQLBadge {
  address: string;
  issuer: string;
  holder: string;
  update_authority: string;
  schema: string;
  metadata_uri: string;
  refreshed_at?: Date;
  slot_created_at?: Date;
  slot_updated_at?: Date;
  created_at?: Date;
}

export interface GraphQLIssuer {
  address: string;
  authority: string;
  verified: boolean;
  refreshed_at?: Date;
  slot_created_at?: Date;
  slot_updated_at?: Date;
  created_at?: Date;
}

export class Badge {
  private readonly sdk: SDK;

  constructor(sdk: SDK) {
    this.sdk = sdk;
  }

  public async getBadge(userAccount: anchor.web3.PublicKey) {
    return await this.sdk.program.account.badge.fetch(userAccount);
  }

  public async getOrCreateBadge(
    metadataUri: string,
    issuer: anchor.web3.PublicKey,
    schema: anchor.web3.PublicKey,
    holder: anchor.web3.PublicKey,
    updateAuthority: anchor.web3.PublicKey,
    authority: anchor.web3.PublicKey,
  ) {
    const [badgePDA, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("badge"),
        issuer.toBuffer(),
        schema.toBuffer(),
        holder.toBuffer(),
      ],
      this.sdk.program.programId
    );

    try {
      await this.getBadge(badgePDA);
    } catch (err) {
      await (await this.createBadge(metadataUri, issuer, schema, holder, updateAuthority, authority)).instructionMethodBuilder.rpc();
    }
    return badgePDA;
  }

  public async createBadge(
    metadataUri: string,
    issuer: anchor.web3.PublicKey,
    schema: anchor.web3.PublicKey,
    holderProfile: anchor.web3.PublicKey,
    updateAuthority: anchor.web3.PublicKey,
    authority: anchor.web3.PublicKey) {
    const instructionMethodBuilder = this.sdk.program.methods
      .createBadge(metadataUri)
      .accounts({
        issuer,
        schema,
        holder: holderProfile,
        updateAuthority,
        authority,
      });
    const pubKeys = await instructionMethodBuilder.pubkeys();
    const badgePDA = pubKeys.badge as anchor.web3.PublicKey;
    return {
      instructionMethodBuilder,
      badgePDA,
    };
  }

  public async updateBadge(
    metadataUri: string,
    badgeAccount: anchor.web3.PublicKey,
    issuer: anchor.web3.PublicKey,
    schema: anchor.web3.PublicKey,
    signer: anchor.web3.PublicKey
  ) {
    return this.sdk.program.methods
      .updateBadge(metadataUri)
      .accounts({
        badge: badgeAccount,
        issuer,
        schema,
        signer,
      });
  }

  public async burnBadge(
    badgeAccount: anchor.web3.PublicKey,
    issuer: anchor.web3.PublicKey,
    schema: anchor.web3.PublicKey,
    holder: anchor.web3.PublicKey,
    signer: anchor.web3.PublicKey
  ) {
    return this.sdk.program.methods
      .burnBadge()
      .accounts({
        badge: badgeAccount,
        issuer,
        schema,
        holder,
        signer,
      });
  }

  public async getOrCreateIssuer(
    authority: anchor.web3.PublicKey,
  ) {
    const [issuer, _] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("issuer"),
        authority.toBuffer(),
      ],
      this.sdk.program.programId
    );

    try {
      await this.getIssuer(issuer);
    } catch (err) {
      await (await this.createIssuer(authority)).instructionMethodBuilder.rpc();
    }
    return issuer;
  }

  public async createIssuer(
    authority: anchor.web3.PublicKey,
  ) {
    const instructionMethodBuilder = this.sdk.program.methods
      .createIssuer()
      .accounts({
        authority,
      });

    const pubKeys = await instructionMethodBuilder.pubkeys();
    const issuerPDA = pubKeys.issuer as anchor.web3.PublicKey;
    return {
      instructionMethodBuilder,
      issuerPDA,
    };
  }

  public async getIssuer(issuerAccount: anchor.web3.PublicKey) {
    return await this.sdk.program.account.issuer.fetch(issuerAccount);
  }

  public async verifyIssuer(issuerAccount: anchor.web3.PublicKey, signer: anchor.web3.PublicKey) {
    return this.sdk.program.methods
      .verifyIssuer()
      .accounts({
        issuer: issuerAccount,
        signer
      });
  }

  public async deleteIssuer(
    issuerAccount: anchor.web3.PublicKey,
    authority: anchor.web3.PublicKey,
  ) {
    return this.sdk.program.methods
      .deleteIssuer()
      .accounts({
        issuer: issuerAccount,
        authority,
      });
  }

  public async getSchema(schemaAccount: anchor.web3.PublicKey) {
    return await this.sdk.program.account.schema.fetch(schemaAccount);
  }

  public async createSchema(
    metadataUri: string,
    authority: anchor.web3.PublicKey,
  ) {
    const randomHash = randomBytes(32);
    const instructionMethodBuilder = this.sdk.program.methods
      // @ts-ignore
      .createSchema(metadataUri, randomHash)
      .accounts({
        authority,
      });

    const pubKeys = await instructionMethodBuilder.pubkeys();
    const schemaPDA = pubKeys.schema as anchor.web3.PublicKey;
    return {
      instructionMethodBuilder,
      schemaPDA,
    };
  }

  public async updateSchema(
    metadataUri: string,
    authority: anchor.web3.PublicKey,
    schemaAccount: anchor.web3.PublicKey,
  ) {
    return this.sdk.program.methods
      .updateSchema(metadataUri)
      .accounts({
        schema: schemaAccount,
        authority,
      });
  }

  public async deleteSchema(
    schemaAccount: anchor.web3.PublicKey,
    authority: anchor.web3.PublicKey,
  ) {
    return this.sdk.program.methods
      .deleteSchema()
      .accounts({
        schema: schemaAccount,
        authority,
      });
  }

  // GraphQL Query methods

  public async getAllBadges(): Promise<GraphQLBadge[]> {
    const query = gql`
      query GetAllBadges {
        badge {
          address
          issuer
          holder
          update_authority
          schema
          metadata_uri
          refreshed_at
          slot_created_at
          slot_updated_at
          created_at
        }
    }`;
    const data = await this.sdk.gqlClient.request<{ badge: GraphQLBadge[] }>(query);
    return data.badge;
  }

  public async getBadgesByIssuer(issuer: string): Promise<GraphQLBadge[]> {
    const query = gql`
      query GetBadgesByIssuer($issuer: String!) {
        badge(where: {issuer: {_eq: $issuer}}) {
          address
          issuer
          holder
          update_authority
          schema
          metadata_uri
          refreshed_at
          slot_created_at
          slot_updated_at
          created_at
        }
    }`;
    const data = await this.sdk.gqlClient.request<{ badge: GraphQLBadge[] }>(query, { issuer });
    return data.badge;
  }

  public async getBadgesByHolder(holder: string): Promise<GraphQLBadge[]> {
    const query = gql`
      query GetBadgesByHolder($holder: String!) {
        badge(where: {holder: {_eq: $holder}}) {
          address
          issuer
          holder
          update_authority
          schema
          metadata_uri
          refreshed_at
          slot_created_at
          slot_updated_at
          created_at
        }
    }`;
    const data = await this.sdk.gqlClient.request<{ badge: GraphQLBadge[] }>(query, { holder });
    return data.badge;
  }

  public async getIssuerByAuthority(authority: string): Promise<GraphQLIssuer[]> {
    const query = gql`
      query GetIssuerByAuthority($authority: String!) {
        issuer(where: {authority: {_eq: $authority}}) {
          address
          authority
          verified
          refreshed_at
          slot_created_at
          slot_updated_at
          created_at
        }
    }`;
    const data = await this.sdk.gqlClient.request<{ issuer: GraphQLIssuer[] }>(query, { authority });
    return data.issuer;
  }

}