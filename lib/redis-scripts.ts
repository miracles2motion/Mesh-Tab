/**
 * Redis Lua scripts for MeshTab testnet synchronization.
 * These scripts ensure atomicity and idempotency for expense creation, editing, and deletion.
 */

// POST /api/tab/[id]/expense/new
// KEYS[1]: expense_by_id hash key (e.g. meshtab:testnet:tab:[id]:expenses_hash)
// KEYS[2]: expense_order zset key (e.g. meshtab:testnet:tab:[id]:expenses_zset)
// KEYS[3]: members hash key (e.g. meshtab:testnet:tab:[id]:members)
// KEYS[4]: tab metadata key (e.g. meshtab:testnet:tab:[id])
// ARGV[1]: expenseId
// ARGV[2]: serverSyncedAt (score)
// ARGV[3]: expense JSON
// ARGV[4]: payerName
// ARGV[5]: payerBalanceDelta (amount paid - amount owed)
// ARGV[6]: splitDetails JSON array string: [{"name": "Alice", "delta": "-25"}, ...]
export const LUA_ADD_EXPENSE = `
  local exists = redis.call("HSETNX", KEYS[1], ARGV[1], ARGV[3])
  if exists == 0 then
    return {0, "alreadyApplied"}
  end
  
  redis.call("ZADD", KEYS[2], ARGV[2], ARGV[1])
  
  -- Apply balances
  local splitDetails = cjson.decode(ARGV[6])
  for i, split in ipairs(splitDetails) do
    redis.call("HINCRBYFLOAT", KEYS[3], split.name, split.delta)
  end
  
  -- Refresh TTLs
  redis.call("EXPIRE", KEYS[1], 2592000)
  redis.call("EXPIRE", KEYS[2], 2592000)
  redis.call("EXPIRE", KEYS[3], 2592000)
  redis.call("EXPIRE", KEYS[4], 2592000)
  
  return {1, "success"}
`;

// PATCH /api/tab/[id]/expense/[expenseId]
// KEYS[1]: expense_by_id hash key
// KEYS[2]: expense_order zset key (to update timestamp if needed)
// KEYS[3]: members hash key
// ARGV[1]: expenseId
// ARGV[2]: new expense JSON
// ARGV[3]: new splitDetails JSON array
// ARGV[4]: old splitDetails JSON array
// ARGV[5]: serverSyncedAt
export const LUA_EDIT_EXPENSE = `
  local oldExpenseStr = redis.call("HGET", KEYS[1], ARGV[1])
  if not oldExpenseStr then
    return {0, "notFound"}
  end
  
  local oldExpense = cjson.decode(oldExpenseStr)
  if oldExpense.isSettlement then
    return {0, "cannotEditSettlement"}
  end

  -- Reverse old balances
  local oldSplits = cjson.decode(ARGV[4])
  for i, split in ipairs(oldSplits) do
    redis.call("HINCRBYFLOAT", KEYS[3], split.name, -tonumber(split.delta))
  end
  
  -- Apply new balances
  local newSplits = cjson.decode(ARGV[3])
  for i, split in ipairs(newSplits) do
    redis.call("HINCRBYFLOAT", KEYS[3], split.name, tonumber(split.delta))
  end
  
  -- Update expense
  redis.call("HSET", KEYS[1], ARGV[1], ARGV[2])
  redis.call("ZADD", KEYS[2], ARGV[5], ARGV[1])
  
  return {1, "success"}
`;

// DELETE /api/tab/[id]/expense/[expenseId]
// KEYS[1]: expense_by_id hash key
// KEYS[2]: members hash key
// ARGV[1]: expenseId
// ARGV[2]: old splitDetails JSON array
// ARGV[3]: tombstone JSON
export const LUA_DELETE_EXPENSE = `
  local oldExpenseStr = redis.call("HGET", KEYS[1], ARGV[1])
  if not oldExpenseStr then
    return {0, "notFound"}
  end
  
  local oldExpense = cjson.decode(oldExpenseStr)
  if oldExpense.isSettlement then
    return {0, "cannotDeleteSettlement"}
  end
  if oldExpense.deletedAt then
    return {1, "alreadyDeleted"}
  end

  -- Reverse balances
  local oldSplits = cjson.decode(ARGV[2])
  for i, split in ipairs(oldSplits) do
    redis.call("HINCRBYFLOAT", KEYS[2], split.name, -tonumber(split.delta))
  end
  
  -- Set tombstone
  redis.call("HSET", KEYS[1], ARGV[1], ARGV[3])
  
  return {1, "success"}
`;

// POST /api/tab/[id]/members (action="remove")
// KEYS[1]: members hash key
// ARGV[1]: member name
export const LUA_REMOVE_MEMBER = `
  local balanceStr = redis.call("HGET", KEYS[1], ARGV[1])
  if not balanceStr then
    return {1, "alreadyRemoved"}
  end
  local balance = tonumber(balanceStr)
  if balance ~= 0 then
    return {0, "balanceNotZero"}
  end
  redis.call("HDEL", KEYS[1], ARGV[1])
  return {1, "success"}
`;
