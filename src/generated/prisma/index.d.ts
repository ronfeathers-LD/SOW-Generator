
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model SOW
 * 
 */
export type SOW = $Result.DefaultSelection<Prisma.$SOWPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more SOWS
 * const sOWS = await prisma.sOW.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more SOWS
   * const sOWS = await prisma.sOW.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

  /**
   * Add a middleware
   * @deprecated since 4.16.0. For new code, prefer client extensions instead.
   * @see https://pris.ly/d/extensions
   */
  $use(cb: Prisma.Middleware): void

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.sOW`: Exposes CRUD operations for the **SOW** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SOWS
    * const sOWS = await prisma.sOW.findMany()
    * ```
    */
  get sOW(): Prisma.SOWDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.9.0
   * Query Engine version: 81e4af48011447c3cc503a190e86995b66d2a28e
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    SOW: 'SOW'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "sOW"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      SOW: {
        payload: Prisma.$SOWPayload<ExtArgs>
        fields: Prisma.SOWFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SOWFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SOWFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          findFirst: {
            args: Prisma.SOWFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SOWFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          findMany: {
            args: Prisma.SOWFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>[]
          }
          create: {
            args: Prisma.SOWCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          createMany: {
            args: Prisma.SOWCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SOWCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>[]
          }
          delete: {
            args: Prisma.SOWDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          update: {
            args: Prisma.SOWUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          deleteMany: {
            args: Prisma.SOWDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SOWUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SOWUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>[]
          }
          upsert: {
            args: Prisma.SOWUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SOWPayload>
          }
          aggregate: {
            args: Prisma.SOWAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSOW>
          }
          groupBy: {
            args: Prisma.SOWGroupByArgs<ExtArgs>
            result: $Utils.Optional<SOWGroupByOutputType>[]
          }
          count: {
            args: Prisma.SOWCountArgs<ExtArgs>
            result: $Utils.Optional<SOWCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Defaults to stdout
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events
     * log: [
     *   { emit: 'stdout', level: 'query' },
     *   { emit: 'stdout', level: 'info' },
     *   { emit: 'stdout', level: 'warn' }
     *   { emit: 'stdout', level: 'error' }
     * ]
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    sOW?: SOWOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type GetLogType<T extends LogLevel | LogDefinition> = T extends LogDefinition ? T['emit'] extends 'event' ? T['level'] : never : never
  export type GetEvents<T extends any> = T extends Array<LogLevel | LogDefinition> ?
    GetLogType<T[0]> | GetLogType<T[1]> | GetLogType<T[2]> | GetLogType<T[3]>
    : never

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  /**
   * These options are being passed into the middleware as "params"
   */
  export type MiddlewareParams = {
    model?: ModelName
    action: PrismaAction
    args: any
    dataPath: string[]
    runInTransaction: boolean
  }

  /**
   * The `T` type makes sure, that the `return proceed` is not forgotten in the middleware implementation
   */
  export type Middleware<T = any> = (
    params: MiddlewareParams,
    next: (params: MiddlewareParams) => $Utils.JsPromise<T>,
  ) => $Utils.JsPromise<T>

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model SOW
   */

  export type AggregateSOW = {
    _count: SOWCountAggregateOutputType | null
    _min: SOWMinAggregateOutputType | null
    _max: SOWMaxAggregateOutputType | null
  }

  export type SOWMinAggregateOutputType = {
    id: string | null
    createdAt: Date | null
    updatedAt: Date | null
    companyLogo: string | null
    clientName: string | null
    sowTitle: string | null
    effectiveDate: Date | null
    clientTitle: string | null
    clientEmail: string | null
    signatureDate: Date | null
    projectDescription: string | null
    startDate: Date | null
    duration: string | null
    accessRequirements: string | null
    travelRequirements: string | null
    workingHours: string | null
    testingResponsibilities: string | null
  }

  export type SOWMaxAggregateOutputType = {
    id: string | null
    createdAt: Date | null
    updatedAt: Date | null
    companyLogo: string | null
    clientName: string | null
    sowTitle: string | null
    effectiveDate: Date | null
    clientTitle: string | null
    clientEmail: string | null
    signatureDate: Date | null
    projectDescription: string | null
    startDate: Date | null
    duration: string | null
    accessRequirements: string | null
    travelRequirements: string | null
    workingHours: string | null
    testingResponsibilities: string | null
  }

  export type SOWCountAggregateOutputType = {
    id: number
    createdAt: number
    updatedAt: number
    companyLogo: number
    clientName: number
    sowTitle: number
    effectiveDate: number
    clientTitle: number
    clientEmail: number
    signatureDate: number
    projectDescription: number
    deliverables: number
    startDate: number
    duration: number
    clientRoles: number
    pricingRoles: number
    billingInfo: number
    accessRequirements: number
    travelRequirements: number
    workingHours: number
    testingResponsibilities: number
    addendums: number
    _all: number
  }


  export type SOWMinAggregateInputType = {
    id?: true
    createdAt?: true
    updatedAt?: true
    companyLogo?: true
    clientName?: true
    sowTitle?: true
    effectiveDate?: true
    clientTitle?: true
    clientEmail?: true
    signatureDate?: true
    projectDescription?: true
    startDate?: true
    duration?: true
    accessRequirements?: true
    travelRequirements?: true
    workingHours?: true
    testingResponsibilities?: true
  }

  export type SOWMaxAggregateInputType = {
    id?: true
    createdAt?: true
    updatedAt?: true
    companyLogo?: true
    clientName?: true
    sowTitle?: true
    effectiveDate?: true
    clientTitle?: true
    clientEmail?: true
    signatureDate?: true
    projectDescription?: true
    startDate?: true
    duration?: true
    accessRequirements?: true
    travelRequirements?: true
    workingHours?: true
    testingResponsibilities?: true
  }

  export type SOWCountAggregateInputType = {
    id?: true
    createdAt?: true
    updatedAt?: true
    companyLogo?: true
    clientName?: true
    sowTitle?: true
    effectiveDate?: true
    clientTitle?: true
    clientEmail?: true
    signatureDate?: true
    projectDescription?: true
    deliverables?: true
    startDate?: true
    duration?: true
    clientRoles?: true
    pricingRoles?: true
    billingInfo?: true
    accessRequirements?: true
    travelRequirements?: true
    workingHours?: true
    testingResponsibilities?: true
    addendums?: true
    _all?: true
  }

  export type SOWAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SOW to aggregate.
     */
    where?: SOWWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SOWS to fetch.
     */
    orderBy?: SOWOrderByWithRelationInput | SOWOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SOWWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SOWS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SOWS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SOWS
    **/
    _count?: true | SOWCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SOWMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SOWMaxAggregateInputType
  }

  export type GetSOWAggregateType<T extends SOWAggregateArgs> = {
        [P in keyof T & keyof AggregateSOW]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSOW[P]>
      : GetScalarType<T[P], AggregateSOW[P]>
  }




  export type SOWGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SOWWhereInput
    orderBy?: SOWOrderByWithAggregationInput | SOWOrderByWithAggregationInput[]
    by: SOWScalarFieldEnum[] | SOWScalarFieldEnum
    having?: SOWScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SOWCountAggregateInputType | true
    _min?: SOWMinAggregateInputType
    _max?: SOWMaxAggregateInputType
  }

  export type SOWGroupByOutputType = {
    id: string
    createdAt: Date
    updatedAt: Date
    companyLogo: string
    clientName: string
    sowTitle: string
    effectiveDate: Date
    clientTitle: string
    clientEmail: string
    signatureDate: Date
    projectDescription: string
    deliverables: JsonValue
    startDate: Date
    duration: string
    clientRoles: JsonValue
    pricingRoles: JsonValue
    billingInfo: JsonValue
    accessRequirements: string
    travelRequirements: string
    workingHours: string
    testingResponsibilities: string
    addendums: JsonValue
    _count: SOWCountAggregateOutputType | null
    _min: SOWMinAggregateOutputType | null
    _max: SOWMaxAggregateOutputType | null
  }

  type GetSOWGroupByPayload<T extends SOWGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SOWGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SOWGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SOWGroupByOutputType[P]>
            : GetScalarType<T[P], SOWGroupByOutputType[P]>
        }
      >
    >


  export type SOWSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyLogo?: boolean
    clientName?: boolean
    sowTitle?: boolean
    effectiveDate?: boolean
    clientTitle?: boolean
    clientEmail?: boolean
    signatureDate?: boolean
    projectDescription?: boolean
    deliverables?: boolean
    startDate?: boolean
    duration?: boolean
    clientRoles?: boolean
    pricingRoles?: boolean
    billingInfo?: boolean
    accessRequirements?: boolean
    travelRequirements?: boolean
    workingHours?: boolean
    testingResponsibilities?: boolean
    addendums?: boolean
  }, ExtArgs["result"]["sOW"]>

  export type SOWSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyLogo?: boolean
    clientName?: boolean
    sowTitle?: boolean
    effectiveDate?: boolean
    clientTitle?: boolean
    clientEmail?: boolean
    signatureDate?: boolean
    projectDescription?: boolean
    deliverables?: boolean
    startDate?: boolean
    duration?: boolean
    clientRoles?: boolean
    pricingRoles?: boolean
    billingInfo?: boolean
    accessRequirements?: boolean
    travelRequirements?: boolean
    workingHours?: boolean
    testingResponsibilities?: boolean
    addendums?: boolean
  }, ExtArgs["result"]["sOW"]>

  export type SOWSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyLogo?: boolean
    clientName?: boolean
    sowTitle?: boolean
    effectiveDate?: boolean
    clientTitle?: boolean
    clientEmail?: boolean
    signatureDate?: boolean
    projectDescription?: boolean
    deliverables?: boolean
    startDate?: boolean
    duration?: boolean
    clientRoles?: boolean
    pricingRoles?: boolean
    billingInfo?: boolean
    accessRequirements?: boolean
    travelRequirements?: boolean
    workingHours?: boolean
    testingResponsibilities?: boolean
    addendums?: boolean
  }, ExtArgs["result"]["sOW"]>

  export type SOWSelectScalar = {
    id?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    companyLogo?: boolean
    clientName?: boolean
    sowTitle?: boolean
    effectiveDate?: boolean
    clientTitle?: boolean
    clientEmail?: boolean
    signatureDate?: boolean
    projectDescription?: boolean
    deliverables?: boolean
    startDate?: boolean
    duration?: boolean
    clientRoles?: boolean
    pricingRoles?: boolean
    billingInfo?: boolean
    accessRequirements?: boolean
    travelRequirements?: boolean
    workingHours?: boolean
    testingResponsibilities?: boolean
    addendums?: boolean
  }

  export type SOWOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "createdAt" | "updatedAt" | "companyLogo" | "clientName" | "sowTitle" | "effectiveDate" | "clientTitle" | "clientEmail" | "signatureDate" | "projectDescription" | "deliverables" | "startDate" | "duration" | "clientRoles" | "pricingRoles" | "billingInfo" | "accessRequirements" | "travelRequirements" | "workingHours" | "testingResponsibilities" | "addendums", ExtArgs["result"]["sOW"]>

  export type $SOWPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SOW"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: string
      createdAt: Date
      updatedAt: Date
      companyLogo: string
      clientName: string
      sowTitle: string
      effectiveDate: Date
      clientTitle: string
      clientEmail: string
      signatureDate: Date
      projectDescription: string
      deliverables: Prisma.JsonValue
      startDate: Date
      duration: string
      clientRoles: Prisma.JsonValue
      pricingRoles: Prisma.JsonValue
      billingInfo: Prisma.JsonValue
      accessRequirements: string
      travelRequirements: string
      workingHours: string
      testingResponsibilities: string
      addendums: Prisma.JsonValue
    }, ExtArgs["result"]["sOW"]>
    composites: {}
  }

  type SOWGetPayload<S extends boolean | null | undefined | SOWDefaultArgs> = $Result.GetResult<Prisma.$SOWPayload, S>

  type SOWCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SOWFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SOWCountAggregateInputType | true
    }

  export interface SOWDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SOW'], meta: { name: 'SOW' } }
    /**
     * Find zero or one SOW that matches the filter.
     * @param {SOWFindUniqueArgs} args - Arguments to find a SOW
     * @example
     * // Get one SOW
     * const sOW = await prisma.sOW.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SOWFindUniqueArgs>(args: SelectSubset<T, SOWFindUniqueArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SOW that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SOWFindUniqueOrThrowArgs} args - Arguments to find a SOW
     * @example
     * // Get one SOW
     * const sOW = await prisma.sOW.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SOWFindUniqueOrThrowArgs>(args: SelectSubset<T, SOWFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SOW that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWFindFirstArgs} args - Arguments to find a SOW
     * @example
     * // Get one SOW
     * const sOW = await prisma.sOW.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SOWFindFirstArgs>(args?: SelectSubset<T, SOWFindFirstArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SOW that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWFindFirstOrThrowArgs} args - Arguments to find a SOW
     * @example
     * // Get one SOW
     * const sOW = await prisma.sOW.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SOWFindFirstOrThrowArgs>(args?: SelectSubset<T, SOWFindFirstOrThrowArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SOWS that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SOWS
     * const sOWS = await prisma.sOW.findMany()
     * 
     * // Get first 10 SOWS
     * const sOWS = await prisma.sOW.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sOWWithIdOnly = await prisma.sOW.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SOWFindManyArgs>(args?: SelectSubset<T, SOWFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SOW.
     * @param {SOWCreateArgs} args - Arguments to create a SOW.
     * @example
     * // Create one SOW
     * const SOW = await prisma.sOW.create({
     *   data: {
     *     // ... data to create a SOW
     *   }
     * })
     * 
     */
    create<T extends SOWCreateArgs>(args: SelectSubset<T, SOWCreateArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SOWS.
     * @param {SOWCreateManyArgs} args - Arguments to create many SOWS.
     * @example
     * // Create many SOWS
     * const sOW = await prisma.sOW.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SOWCreateManyArgs>(args?: SelectSubset<T, SOWCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SOWS and returns the data saved in the database.
     * @param {SOWCreateManyAndReturnArgs} args - Arguments to create many SOWS.
     * @example
     * // Create many SOWS
     * const sOW = await prisma.sOW.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SOWS and only return the `id`
     * const sOWWithIdOnly = await prisma.sOW.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SOWCreateManyAndReturnArgs>(args?: SelectSubset<T, SOWCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SOW.
     * @param {SOWDeleteArgs} args - Arguments to delete one SOW.
     * @example
     * // Delete one SOW
     * const SOW = await prisma.sOW.delete({
     *   where: {
     *     // ... filter to delete one SOW
     *   }
     * })
     * 
     */
    delete<T extends SOWDeleteArgs>(args: SelectSubset<T, SOWDeleteArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SOW.
     * @param {SOWUpdateArgs} args - Arguments to update one SOW.
     * @example
     * // Update one SOW
     * const sOW = await prisma.sOW.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SOWUpdateArgs>(args: SelectSubset<T, SOWUpdateArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SOWS.
     * @param {SOWDeleteManyArgs} args - Arguments to filter SOWS to delete.
     * @example
     * // Delete a few SOWS
     * const { count } = await prisma.sOW.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SOWDeleteManyArgs>(args?: SelectSubset<T, SOWDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SOWS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SOWS
     * const sOW = await prisma.sOW.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SOWUpdateManyArgs>(args: SelectSubset<T, SOWUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SOWS and returns the data updated in the database.
     * @param {SOWUpdateManyAndReturnArgs} args - Arguments to update many SOWS.
     * @example
     * // Update many SOWS
     * const sOW = await prisma.sOW.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SOWS and only return the `id`
     * const sOWWithIdOnly = await prisma.sOW.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SOWUpdateManyAndReturnArgs>(args: SelectSubset<T, SOWUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SOW.
     * @param {SOWUpsertArgs} args - Arguments to update or create a SOW.
     * @example
     * // Update or create a SOW
     * const sOW = await prisma.sOW.upsert({
     *   create: {
     *     // ... data to create a SOW
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SOW we want to update
     *   }
     * })
     */
    upsert<T extends SOWUpsertArgs>(args: SelectSubset<T, SOWUpsertArgs<ExtArgs>>): Prisma__SOWClient<$Result.GetResult<Prisma.$SOWPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SOWS.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWCountArgs} args - Arguments to filter SOWS to count.
     * @example
     * // Count the number of SOWS
     * const count = await prisma.sOW.count({
     *   where: {
     *     // ... the filter for the SOWS we want to count
     *   }
     * })
    **/
    count<T extends SOWCountArgs>(
      args?: Subset<T, SOWCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SOWCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SOW.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SOWAggregateArgs>(args: Subset<T, SOWAggregateArgs>): Prisma.PrismaPromise<GetSOWAggregateType<T>>

    /**
     * Group by SOW.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SOWGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SOWGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SOWGroupByArgs['orderBy'] }
        : { orderBy?: SOWGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SOWGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSOWGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SOW model
   */
  readonly fields: SOWFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SOW.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SOWClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SOW model
   */
  interface SOWFieldRefs {
    readonly id: FieldRef<"SOW", 'String'>
    readonly createdAt: FieldRef<"SOW", 'DateTime'>
    readonly updatedAt: FieldRef<"SOW", 'DateTime'>
    readonly companyLogo: FieldRef<"SOW", 'String'>
    readonly clientName: FieldRef<"SOW", 'String'>
    readonly sowTitle: FieldRef<"SOW", 'String'>
    readonly effectiveDate: FieldRef<"SOW", 'DateTime'>
    readonly clientTitle: FieldRef<"SOW", 'String'>
    readonly clientEmail: FieldRef<"SOW", 'String'>
    readonly signatureDate: FieldRef<"SOW", 'DateTime'>
    readonly projectDescription: FieldRef<"SOW", 'String'>
    readonly deliverables: FieldRef<"SOW", 'Json'>
    readonly startDate: FieldRef<"SOW", 'DateTime'>
    readonly duration: FieldRef<"SOW", 'String'>
    readonly clientRoles: FieldRef<"SOW", 'Json'>
    readonly pricingRoles: FieldRef<"SOW", 'Json'>
    readonly billingInfo: FieldRef<"SOW", 'Json'>
    readonly accessRequirements: FieldRef<"SOW", 'String'>
    readonly travelRequirements: FieldRef<"SOW", 'String'>
    readonly workingHours: FieldRef<"SOW", 'String'>
    readonly testingResponsibilities: FieldRef<"SOW", 'String'>
    readonly addendums: FieldRef<"SOW", 'Json'>
  }
    

  // Custom InputTypes
  /**
   * SOW findUnique
   */
  export type SOWFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter, which SOW to fetch.
     */
    where: SOWWhereUniqueInput
  }

  /**
   * SOW findUniqueOrThrow
   */
  export type SOWFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter, which SOW to fetch.
     */
    where: SOWWhereUniqueInput
  }

  /**
   * SOW findFirst
   */
  export type SOWFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter, which SOW to fetch.
     */
    where?: SOWWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SOWS to fetch.
     */
    orderBy?: SOWOrderByWithRelationInput | SOWOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SOWS.
     */
    cursor?: SOWWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SOWS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SOWS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SOWS.
     */
    distinct?: SOWScalarFieldEnum | SOWScalarFieldEnum[]
  }

  /**
   * SOW findFirstOrThrow
   */
  export type SOWFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter, which SOW to fetch.
     */
    where?: SOWWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SOWS to fetch.
     */
    orderBy?: SOWOrderByWithRelationInput | SOWOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SOWS.
     */
    cursor?: SOWWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SOWS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SOWS.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SOWS.
     */
    distinct?: SOWScalarFieldEnum | SOWScalarFieldEnum[]
  }

  /**
   * SOW findMany
   */
  export type SOWFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter, which SOWS to fetch.
     */
    where?: SOWWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SOWS to fetch.
     */
    orderBy?: SOWOrderByWithRelationInput | SOWOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SOWS.
     */
    cursor?: SOWWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SOWS from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SOWS.
     */
    skip?: number
    distinct?: SOWScalarFieldEnum | SOWScalarFieldEnum[]
  }

  /**
   * SOW create
   */
  export type SOWCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * The data needed to create a SOW.
     */
    data: XOR<SOWCreateInput, SOWUncheckedCreateInput>
  }

  /**
   * SOW createMany
   */
  export type SOWCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SOWS.
     */
    data: SOWCreateManyInput | SOWCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SOW createManyAndReturn
   */
  export type SOWCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * The data used to create many SOWS.
     */
    data: SOWCreateManyInput | SOWCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SOW update
   */
  export type SOWUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * The data needed to update a SOW.
     */
    data: XOR<SOWUpdateInput, SOWUncheckedUpdateInput>
    /**
     * Choose, which SOW to update.
     */
    where: SOWWhereUniqueInput
  }

  /**
   * SOW updateMany
   */
  export type SOWUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SOWS.
     */
    data: XOR<SOWUpdateManyMutationInput, SOWUncheckedUpdateManyInput>
    /**
     * Filter which SOWS to update
     */
    where?: SOWWhereInput
    /**
     * Limit how many SOWS to update.
     */
    limit?: number
  }

  /**
   * SOW updateManyAndReturn
   */
  export type SOWUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * The data used to update SOWS.
     */
    data: XOR<SOWUpdateManyMutationInput, SOWUncheckedUpdateManyInput>
    /**
     * Filter which SOWS to update
     */
    where?: SOWWhereInput
    /**
     * Limit how many SOWS to update.
     */
    limit?: number
  }

  /**
   * SOW upsert
   */
  export type SOWUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * The filter to search for the SOW to update in case it exists.
     */
    where: SOWWhereUniqueInput
    /**
     * In case the SOW found by the `where` argument doesn't exist, create a new SOW with this data.
     */
    create: XOR<SOWCreateInput, SOWUncheckedCreateInput>
    /**
     * In case the SOW was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SOWUpdateInput, SOWUncheckedUpdateInput>
  }

  /**
   * SOW delete
   */
  export type SOWDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
    /**
     * Filter which SOW to delete.
     */
    where: SOWWhereUniqueInput
  }

  /**
   * SOW deleteMany
   */
  export type SOWDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SOWS to delete
     */
    where?: SOWWhereInput
    /**
     * Limit how many SOWS to delete.
     */
    limit?: number
  }

  /**
   * SOW without action
   */
  export type SOWDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SOW
     */
    select?: SOWSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SOW
     */
    omit?: SOWOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const SOWScalarFieldEnum: {
    id: 'id',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    companyLogo: 'companyLogo',
    clientName: 'clientName',
    sowTitle: 'sowTitle',
    effectiveDate: 'effectiveDate',
    clientTitle: 'clientTitle',
    clientEmail: 'clientEmail',
    signatureDate: 'signatureDate',
    projectDescription: 'projectDescription',
    deliverables: 'deliverables',
    startDate: 'startDate',
    duration: 'duration',
    clientRoles: 'clientRoles',
    pricingRoles: 'pricingRoles',
    billingInfo: 'billingInfo',
    accessRequirements: 'accessRequirements',
    travelRequirements: 'travelRequirements',
    workingHours: 'workingHours',
    testingResponsibilities: 'testingResponsibilities',
    addendums: 'addendums'
  };

  export type SOWScalarFieldEnum = (typeof SOWScalarFieldEnum)[keyof typeof SOWScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const JsonNullValueInput: {
    JsonNull: typeof JsonNull
  };

  export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    
  /**
   * Deep Input Types
   */


  export type SOWWhereInput = {
    AND?: SOWWhereInput | SOWWhereInput[]
    OR?: SOWWhereInput[]
    NOT?: SOWWhereInput | SOWWhereInput[]
    id?: StringFilter<"SOW"> | string
    createdAt?: DateTimeFilter<"SOW"> | Date | string
    updatedAt?: DateTimeFilter<"SOW"> | Date | string
    companyLogo?: StringFilter<"SOW"> | string
    clientName?: StringFilter<"SOW"> | string
    sowTitle?: StringFilter<"SOW"> | string
    effectiveDate?: DateTimeFilter<"SOW"> | Date | string
    clientTitle?: StringFilter<"SOW"> | string
    clientEmail?: StringFilter<"SOW"> | string
    signatureDate?: DateTimeFilter<"SOW"> | Date | string
    projectDescription?: StringFilter<"SOW"> | string
    deliverables?: JsonFilter<"SOW">
    startDate?: DateTimeFilter<"SOW"> | Date | string
    duration?: StringFilter<"SOW"> | string
    clientRoles?: JsonFilter<"SOW">
    pricingRoles?: JsonFilter<"SOW">
    billingInfo?: JsonFilter<"SOW">
    accessRequirements?: StringFilter<"SOW"> | string
    travelRequirements?: StringFilter<"SOW"> | string
    workingHours?: StringFilter<"SOW"> | string
    testingResponsibilities?: StringFilter<"SOW"> | string
    addendums?: JsonFilter<"SOW">
  }

  export type SOWOrderByWithRelationInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyLogo?: SortOrder
    clientName?: SortOrder
    sowTitle?: SortOrder
    effectiveDate?: SortOrder
    clientTitle?: SortOrder
    clientEmail?: SortOrder
    signatureDate?: SortOrder
    projectDescription?: SortOrder
    deliverables?: SortOrder
    startDate?: SortOrder
    duration?: SortOrder
    clientRoles?: SortOrder
    pricingRoles?: SortOrder
    billingInfo?: SortOrder
    accessRequirements?: SortOrder
    travelRequirements?: SortOrder
    workingHours?: SortOrder
    testingResponsibilities?: SortOrder
    addendums?: SortOrder
  }

  export type SOWWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SOWWhereInput | SOWWhereInput[]
    OR?: SOWWhereInput[]
    NOT?: SOWWhereInput | SOWWhereInput[]
    createdAt?: DateTimeFilter<"SOW"> | Date | string
    updatedAt?: DateTimeFilter<"SOW"> | Date | string
    companyLogo?: StringFilter<"SOW"> | string
    clientName?: StringFilter<"SOW"> | string
    sowTitle?: StringFilter<"SOW"> | string
    effectiveDate?: DateTimeFilter<"SOW"> | Date | string
    clientTitle?: StringFilter<"SOW"> | string
    clientEmail?: StringFilter<"SOW"> | string
    signatureDate?: DateTimeFilter<"SOW"> | Date | string
    projectDescription?: StringFilter<"SOW"> | string
    deliverables?: JsonFilter<"SOW">
    startDate?: DateTimeFilter<"SOW"> | Date | string
    duration?: StringFilter<"SOW"> | string
    clientRoles?: JsonFilter<"SOW">
    pricingRoles?: JsonFilter<"SOW">
    billingInfo?: JsonFilter<"SOW">
    accessRequirements?: StringFilter<"SOW"> | string
    travelRequirements?: StringFilter<"SOW"> | string
    workingHours?: StringFilter<"SOW"> | string
    testingResponsibilities?: StringFilter<"SOW"> | string
    addendums?: JsonFilter<"SOW">
  }, "id">

  export type SOWOrderByWithAggregationInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyLogo?: SortOrder
    clientName?: SortOrder
    sowTitle?: SortOrder
    effectiveDate?: SortOrder
    clientTitle?: SortOrder
    clientEmail?: SortOrder
    signatureDate?: SortOrder
    projectDescription?: SortOrder
    deliverables?: SortOrder
    startDate?: SortOrder
    duration?: SortOrder
    clientRoles?: SortOrder
    pricingRoles?: SortOrder
    billingInfo?: SortOrder
    accessRequirements?: SortOrder
    travelRequirements?: SortOrder
    workingHours?: SortOrder
    testingResponsibilities?: SortOrder
    addendums?: SortOrder
    _count?: SOWCountOrderByAggregateInput
    _max?: SOWMaxOrderByAggregateInput
    _min?: SOWMinOrderByAggregateInput
  }

  export type SOWScalarWhereWithAggregatesInput = {
    AND?: SOWScalarWhereWithAggregatesInput | SOWScalarWhereWithAggregatesInput[]
    OR?: SOWScalarWhereWithAggregatesInput[]
    NOT?: SOWScalarWhereWithAggregatesInput | SOWScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"SOW"> | string
    createdAt?: DateTimeWithAggregatesFilter<"SOW"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SOW"> | Date | string
    companyLogo?: StringWithAggregatesFilter<"SOW"> | string
    clientName?: StringWithAggregatesFilter<"SOW"> | string
    sowTitle?: StringWithAggregatesFilter<"SOW"> | string
    effectiveDate?: DateTimeWithAggregatesFilter<"SOW"> | Date | string
    clientTitle?: StringWithAggregatesFilter<"SOW"> | string
    clientEmail?: StringWithAggregatesFilter<"SOW"> | string
    signatureDate?: DateTimeWithAggregatesFilter<"SOW"> | Date | string
    projectDescription?: StringWithAggregatesFilter<"SOW"> | string
    deliverables?: JsonWithAggregatesFilter<"SOW">
    startDate?: DateTimeWithAggregatesFilter<"SOW"> | Date | string
    duration?: StringWithAggregatesFilter<"SOW"> | string
    clientRoles?: JsonWithAggregatesFilter<"SOW">
    pricingRoles?: JsonWithAggregatesFilter<"SOW">
    billingInfo?: JsonWithAggregatesFilter<"SOW">
    accessRequirements?: StringWithAggregatesFilter<"SOW"> | string
    travelRequirements?: StringWithAggregatesFilter<"SOW"> | string
    workingHours?: StringWithAggregatesFilter<"SOW"> | string
    testingResponsibilities?: StringWithAggregatesFilter<"SOW"> | string
    addendums?: JsonWithAggregatesFilter<"SOW">
  }

  export type SOWCreateInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    companyLogo: string
    clientName: string
    sowTitle: string
    effectiveDate: Date | string
    clientTitle: string
    clientEmail: string
    signatureDate: Date | string
    projectDescription: string
    deliverables: JsonNullValueInput | InputJsonValue
    startDate: Date | string
    duration: string
    clientRoles: JsonNullValueInput | InputJsonValue
    pricingRoles: JsonNullValueInput | InputJsonValue
    billingInfo: JsonNullValueInput | InputJsonValue
    accessRequirements: string
    travelRequirements: string
    workingHours: string
    testingResponsibilities: string
    addendums: JsonNullValueInput | InputJsonValue
  }

  export type SOWUncheckedCreateInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    companyLogo: string
    clientName: string
    sowTitle: string
    effectiveDate: Date | string
    clientTitle: string
    clientEmail: string
    signatureDate: Date | string
    projectDescription: string
    deliverables: JsonNullValueInput | InputJsonValue
    startDate: Date | string
    duration: string
    clientRoles: JsonNullValueInput | InputJsonValue
    pricingRoles: JsonNullValueInput | InputJsonValue
    billingInfo: JsonNullValueInput | InputJsonValue
    accessRequirements: string
    travelRequirements: string
    workingHours: string
    testingResponsibilities: string
    addendums: JsonNullValueInput | InputJsonValue
  }

  export type SOWUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyLogo?: StringFieldUpdateOperationsInput | string
    clientName?: StringFieldUpdateOperationsInput | string
    sowTitle?: StringFieldUpdateOperationsInput | string
    effectiveDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clientTitle?: StringFieldUpdateOperationsInput | string
    clientEmail?: StringFieldUpdateOperationsInput | string
    signatureDate?: DateTimeFieldUpdateOperationsInput | Date | string
    projectDescription?: StringFieldUpdateOperationsInput | string
    deliverables?: JsonNullValueInput | InputJsonValue
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: StringFieldUpdateOperationsInput | string
    clientRoles?: JsonNullValueInput | InputJsonValue
    pricingRoles?: JsonNullValueInput | InputJsonValue
    billingInfo?: JsonNullValueInput | InputJsonValue
    accessRequirements?: StringFieldUpdateOperationsInput | string
    travelRequirements?: StringFieldUpdateOperationsInput | string
    workingHours?: StringFieldUpdateOperationsInput | string
    testingResponsibilities?: StringFieldUpdateOperationsInput | string
    addendums?: JsonNullValueInput | InputJsonValue
  }

  export type SOWUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyLogo?: StringFieldUpdateOperationsInput | string
    clientName?: StringFieldUpdateOperationsInput | string
    sowTitle?: StringFieldUpdateOperationsInput | string
    effectiveDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clientTitle?: StringFieldUpdateOperationsInput | string
    clientEmail?: StringFieldUpdateOperationsInput | string
    signatureDate?: DateTimeFieldUpdateOperationsInput | Date | string
    projectDescription?: StringFieldUpdateOperationsInput | string
    deliverables?: JsonNullValueInput | InputJsonValue
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: StringFieldUpdateOperationsInput | string
    clientRoles?: JsonNullValueInput | InputJsonValue
    pricingRoles?: JsonNullValueInput | InputJsonValue
    billingInfo?: JsonNullValueInput | InputJsonValue
    accessRequirements?: StringFieldUpdateOperationsInput | string
    travelRequirements?: StringFieldUpdateOperationsInput | string
    workingHours?: StringFieldUpdateOperationsInput | string
    testingResponsibilities?: StringFieldUpdateOperationsInput | string
    addendums?: JsonNullValueInput | InputJsonValue
  }

  export type SOWCreateManyInput = {
    id?: string
    createdAt?: Date | string
    updatedAt?: Date | string
    companyLogo: string
    clientName: string
    sowTitle: string
    effectiveDate: Date | string
    clientTitle: string
    clientEmail: string
    signatureDate: Date | string
    projectDescription: string
    deliverables: JsonNullValueInput | InputJsonValue
    startDate: Date | string
    duration: string
    clientRoles: JsonNullValueInput | InputJsonValue
    pricingRoles: JsonNullValueInput | InputJsonValue
    billingInfo: JsonNullValueInput | InputJsonValue
    accessRequirements: string
    travelRequirements: string
    workingHours: string
    testingResponsibilities: string
    addendums: JsonNullValueInput | InputJsonValue
  }

  export type SOWUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyLogo?: StringFieldUpdateOperationsInput | string
    clientName?: StringFieldUpdateOperationsInput | string
    sowTitle?: StringFieldUpdateOperationsInput | string
    effectiveDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clientTitle?: StringFieldUpdateOperationsInput | string
    clientEmail?: StringFieldUpdateOperationsInput | string
    signatureDate?: DateTimeFieldUpdateOperationsInput | Date | string
    projectDescription?: StringFieldUpdateOperationsInput | string
    deliverables?: JsonNullValueInput | InputJsonValue
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: StringFieldUpdateOperationsInput | string
    clientRoles?: JsonNullValueInput | InputJsonValue
    pricingRoles?: JsonNullValueInput | InputJsonValue
    billingInfo?: JsonNullValueInput | InputJsonValue
    accessRequirements?: StringFieldUpdateOperationsInput | string
    travelRequirements?: StringFieldUpdateOperationsInput | string
    workingHours?: StringFieldUpdateOperationsInput | string
    testingResponsibilities?: StringFieldUpdateOperationsInput | string
    addendums?: JsonNullValueInput | InputJsonValue
  }

  export type SOWUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    companyLogo?: StringFieldUpdateOperationsInput | string
    clientName?: StringFieldUpdateOperationsInput | string
    sowTitle?: StringFieldUpdateOperationsInput | string
    effectiveDate?: DateTimeFieldUpdateOperationsInput | Date | string
    clientTitle?: StringFieldUpdateOperationsInput | string
    clientEmail?: StringFieldUpdateOperationsInput | string
    signatureDate?: DateTimeFieldUpdateOperationsInput | Date | string
    projectDescription?: StringFieldUpdateOperationsInput | string
    deliverables?: JsonNullValueInput | InputJsonValue
    startDate?: DateTimeFieldUpdateOperationsInput | Date | string
    duration?: StringFieldUpdateOperationsInput | string
    clientRoles?: JsonNullValueInput | InputJsonValue
    pricingRoles?: JsonNullValueInput | InputJsonValue
    billingInfo?: JsonNullValueInput | InputJsonValue
    accessRequirements?: StringFieldUpdateOperationsInput | string
    travelRequirements?: StringFieldUpdateOperationsInput | string
    workingHours?: StringFieldUpdateOperationsInput | string
    testingResponsibilities?: StringFieldUpdateOperationsInput | string
    addendums?: JsonNullValueInput | InputJsonValue
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }
  export type JsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonFilterBase<$PrismaModel>>, 'path'>>

  export type JsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type SOWCountOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyLogo?: SortOrder
    clientName?: SortOrder
    sowTitle?: SortOrder
    effectiveDate?: SortOrder
    clientTitle?: SortOrder
    clientEmail?: SortOrder
    signatureDate?: SortOrder
    projectDescription?: SortOrder
    deliverables?: SortOrder
    startDate?: SortOrder
    duration?: SortOrder
    clientRoles?: SortOrder
    pricingRoles?: SortOrder
    billingInfo?: SortOrder
    accessRequirements?: SortOrder
    travelRequirements?: SortOrder
    workingHours?: SortOrder
    testingResponsibilities?: SortOrder
    addendums?: SortOrder
  }

  export type SOWMaxOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyLogo?: SortOrder
    clientName?: SortOrder
    sowTitle?: SortOrder
    effectiveDate?: SortOrder
    clientTitle?: SortOrder
    clientEmail?: SortOrder
    signatureDate?: SortOrder
    projectDescription?: SortOrder
    startDate?: SortOrder
    duration?: SortOrder
    accessRequirements?: SortOrder
    travelRequirements?: SortOrder
    workingHours?: SortOrder
    testingResponsibilities?: SortOrder
  }

  export type SOWMinOrderByAggregateInput = {
    id?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    companyLogo?: SortOrder
    clientName?: SortOrder
    sowTitle?: SortOrder
    effectiveDate?: SortOrder
    clientTitle?: SortOrder
    clientEmail?: SortOrder
    signatureDate?: SortOrder
    projectDescription?: SortOrder
    startDate?: SortOrder
    duration?: SortOrder
    accessRequirements?: SortOrder
    travelRequirements?: SortOrder
    workingHours?: SortOrder
    testingResponsibilities?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedJsonFilter<$PrismaModel>
    _max?: NestedJsonFilter<$PrismaModel>
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}