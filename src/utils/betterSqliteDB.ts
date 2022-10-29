import db from 'better-sqlite3';
import { Channel, Guild, GuildMember, Message, Role, User } from 'discord.js';
import {isMessageInstance} from '@sapphire/discord.js-utilities'

type ValidTarget = Message|Channel|Role|Guild|User|GuildMember;
type AttributeData = string|number|boolean|null|{[x: string]: AttributeData}|AttributeData[]
type AttributedChannel<a extends ValidTarget> = a & { attributes: {[x: string]: AttributeData} }
type Cache = {[x: string]: AttributedChannel<ValidTarget>}[]

class betterSqliteDB {
    private db: db.Database;
    private cache: Cache;

    constructor(data: { file: string, options: db.Options }) {
        this.db = new db(data.file, data.options);
        this.db.exec(`CREATE TABLE IF NOT EXISTS attributes (type varchar(255), id varchar(255), attribute varchar(255), data varchar(255))`);
        /*
            db configuration: {
                TYPE: "message"|"channel"|"member"|"message"|"role"
                ID: string
                ATTRIBUTES: string of {[x: string]: AttributeData}
            }
        */
        this.cache = [];
    };
    
    public async getAttributes(target: ValidTarget): Promise<AttributedChannel<typeof target>> {
        const result = this.db.prepare(`SELECT attributes FROM attributes where type = ? and id = ?`).get(target.id);
        const parsedAttributes: {[x: string]: AttributeData} = JSON.parse(result.attributes);
        return Object.assign(target, { attributes: parsedAttributes });
    };

    public async setAttributes(target: ValidTarget, attributes: {[x: string]: AttributeData}): Promise<boolean> {
        this.db.pragma
    };

    public async cacheAttributes(target: ValidTarget): Promise<Cache>  {
        
    };
};

export {
    db
};