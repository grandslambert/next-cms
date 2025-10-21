/**
 * Model Factory for Multi-Database Architecture
 * 
 * This factory provides model instances for different database connections:
 * - Global models: Users, Roles, Sites, etc. (nextcms_global)
 * - Site models: Posts, Media, Settings, etc. (nextcms_site{id})
 */

import mongoose from 'mongoose';
import { connectToGlobalDB, connectToSiteDB } from './mongodb';

// Import all schemas from model files
import { UserSchema, type IUser } from './models/User';
import { SiteSchema, type ISite } from './models/Site';
import { RoleSchema, type IRole } from './models/Role';
import { SiteUserSchema, type ISiteUser } from './models/SiteUser';
import { GlobalSettingSchema, type IGlobalSetting } from './models/GlobalSetting';
import { UserMetaSchema, type IUserMeta } from './models/UserMeta';

// Site-specific model schemas
import { SettingSchema, type ISetting } from './models/Setting';
import { PostTypeSchema, type IPostType } from './models/PostType';
import { PostSchema, type IPost } from './models/Post';
import { PostMetaSchema, type IPostMeta } from './models/PostMeta';
import { PostRevisionSchema, type IPostRevision } from './models/PostRevision';
import { TaxonomySchema, type ITaxonomy } from './models/Taxonomy';
import { TermSchema, type ITerm } from './models/Term';
import { PostTermSchema, type IPostTerm } from './models/PostTerm';
import { MenuSchema, type IMenu } from './models/Menu';
import { MenuItemSchema, type IMenuItem } from './models/MenuItem';
import { MenuItemMetaSchema, type IMenuItemMeta } from './models/MenuItemMeta';
import { MenuLocationSchema, type IMenuLocation } from './models/MenuLocation';
import { MediaSchema, type IMedia } from './models/Media';
import { MediaFolderSchema, type IMediaFolder } from './models/MediaFolder';
import { ActivityLogSchema, type IActivityLog } from './models/ActivityLog';

// Export types
export type {
  IUser,
  ISite,
  IRole,
  ISiteUser,
  IGlobalSetting,
  IUserMeta,
  ISetting,
  IPostType,
  IPost,
  IPostMeta,
  IPostRevision,
  ITaxonomy,
  ITerm,
  IPostTerm,
  IMenu,
  IMenuItem,
  IMenuItemMeta,
  IMenuLocation,
  IMedia,
  IMediaFolder,
  IActivityLog,
};

/**
 * Global Models Factory
 * These models live in the nextcms_global database
 */
export class GlobalModels {
  private static connection: mongoose.Connection | null = null;

  static async getConnection(): Promise<mongoose.Connection> {
    if (!this.connection) {
      this.connection = await connectToGlobalDB();
    }
    return this.connection;
  }

  static async User() {
    const conn = await this.getConnection();
    return conn.models.User || conn.model<IUser>('User', UserSchema);
  }

  static async Site() {
    const conn = await this.getConnection();
    return conn.models.Site || conn.model<ISite>('Site', SiteSchema);
  }

  static async Role() {
    const conn = await this.getConnection();
    return conn.models.Role || conn.model<IRole>('Role', RoleSchema);
  }

  static async SiteUser() {
    const conn = await this.getConnection();
    return conn.models.SiteUser || conn.model<ISiteUser>('SiteUser', SiteUserSchema);
  }

  static async GlobalSetting() {
    const conn = await this.getConnection();
    return conn.models.GlobalSetting || conn.model<IGlobalSetting>('GlobalSetting', GlobalSettingSchema);
  }

  static async UserMeta() {
    const conn = await this.getConnection();
    return conn.models.UserMeta || conn.model<IUserMeta>('UserMeta', UserMetaSchema);
  }

  static async ActivityLog() {
    const conn = await this.getConnection();
    return conn.models.ActivityLog || conn.model<IActivityLog>('ActivityLog', ActivityLogSchema);
  }
}

/**
 * Site-Specific Models Factory
 * These models live in site-specific databases (nextcms_site{id})
 */
export class SiteModels {
  private static connections: Map<number, mongoose.Connection> = new Map();

  static async getConnection(siteId: number): Promise<mongoose.Connection> {
    if (!this.connections.has(siteId)) {
      const conn = await connectToSiteDB(siteId);
      this.connections.set(siteId, conn);
    }
    return this.connections.get(siteId)!;
  }

  static async Setting(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Setting || conn.model<ISetting>('Setting', SettingSchema);
  }

  static async PostType(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.PostType || conn.model<IPostType>('PostType', PostTypeSchema);
  }

  static async Post(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Post || conn.model<IPost>('Post', PostSchema);
  }

  static async PostMeta(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.PostMeta || conn.model<IPostMeta>('PostMeta', PostMetaSchema);
  }

  static async PostRevision(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.PostRevision || conn.model<IPostRevision>('PostRevision', PostRevisionSchema);
  }

  static async Taxonomy(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Taxonomy || conn.model<ITaxonomy>('Taxonomy', TaxonomySchema);
  }

  static async Term(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Term || conn.model<ITerm>('Term', TermSchema);
  }

  static async PostTerm(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.PostTerm || conn.model<IPostTerm>('PostTerm', PostTermSchema);
  }

  static async Menu(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Menu || conn.model<IMenu>('Menu', MenuSchema);
  }

  static async MenuItem(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.MenuItem || conn.model<IMenuItem>('MenuItem', MenuItemSchema);
  }

  static async MenuItemMeta(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.MenuItemMeta || conn.model<IMenuItemMeta>('MenuItemMeta', MenuItemMetaSchema);
  }

  static async MenuLocation(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.MenuLocation || conn.model<IMenuLocation>('MenuLocation', MenuLocationSchema);
  }

  static async Media(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.Media || conn.model<IMedia>('Media', MediaSchema);
  }

  static async MediaFolder(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.MediaFolder || conn.model<IMediaFolder>('MediaFolder', MediaFolderSchema);
  }

  static async ActivityLog(siteId: number) {
    const conn = await this.getConnection(siteId);
    return conn.models.ActivityLog || conn.model<IActivityLog>('ActivityLog', ActivityLogSchema);
  }
}

/**
 * Convenience function to get all site models for a specific site
 */
export async function getSiteModels(siteId: number) {
  return {
    Setting: await SiteModels.Setting(siteId),
    PostType: await SiteModels.PostType(siteId),
    Post: await SiteModels.Post(siteId),
    PostMeta: await SiteModels.PostMeta(siteId),
    PostRevision: await SiteModels.PostRevision(siteId),
    Taxonomy: await SiteModels.Taxonomy(siteId),
    Term: await SiteModels.Term(siteId),
    PostTerm: await SiteModels.PostTerm(siteId),
    Menu: await SiteModels.Menu(siteId),
    MenuItem: await SiteModels.MenuItem(siteId),
    MenuItemMeta: await SiteModels.MenuItemMeta(siteId),
    MenuLocation: await SiteModels.MenuLocation(siteId),
    Media: await SiteModels.Media(siteId),
    MediaFolder: await SiteModels.MediaFolder(siteId),
    ActivityLog: await SiteModels.ActivityLog(siteId),
  };
}

/**
 * Convenience function to get all global models
 */
export async function getGlobalModels() {
  return {
    User: await GlobalModels.User(),
    Site: await GlobalModels.Site(),
    Role: await GlobalModels.Role(),
    SiteUser: await GlobalModels.SiteUser(),
    GlobalSetting: await GlobalModels.GlobalSetting(),
    UserMeta: await GlobalModels.UserMeta(),
    ActivityLog: await GlobalModels.ActivityLog(),
  };
}

