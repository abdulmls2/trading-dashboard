// Trading analysis prompt keywords
// Each keyword maps to a specific prompt that gets appended to the base prompt

// APM Prompt
export const APM_PROMPT = `
Question:
Valid/invalid APM and conditions?

Answer:
-APM (Average Price Movement) is a daily calculation used to estimate how much a currency pair is expected to move in a trading day.
-How APM is Calculated:

We measure the last five daily candles, wick to wick.
Add up the total pip movement.
Divide by five to get the estimated APM for today.

Conditions for a Valid APM:
-If the APM is 60 pips or more, the currency is tradeable.
-The higher the APM, the better, as it allows for realistic risk-to-reward setups (e.g., 1:5 R:R with 15-pip SL and 75-pip TP).

Conditions for an Invalid APM:
-If the APM is below 60 pips, we do not trade that currency for the day.
-If APM exceeds R3 or S3 pivots, the trading day is invalid unless it only slightly exceeds.
-If APM is between R3 & R4 or S3 & S4, the day is fully invalid.
Final Rule: If APM exceeds acceptable levels, the price action becomes unreliable for entries, and we avoid trading that pair.
[PROMPT_ID: APM_001]
`;

// Discipline Trading Prompt
export const DISIPLINE_TRADING_PROMPT = `
Question: Risk Management?

Answer:
-We only risk 1% maximum of our capital when trading.
-We use 15 pips stop loss 
-We use take profits at 75 pips.
-We close 25% of our trade when price reaches 28-30 pips.
-We should never move our Stop Loss to BreakEven (BE)

You should be disciplined in your trading, always have a minimum risk reward ratio of 1:5.
Start trading from 07:00 am and look to exit between 5:00 to 9:30 pm UK time.
Ideally after 04:00 pm you should stop looking for trades.
At Come Learn Forex, we don't hold trades overnight

Our monthly target is 300 pips. 
If you reach your monthly target of 300 pips, you should not overtrade.

Question: How many set ups for the day max?
"How many setups should I take in a day?"

Answer:
✅ We only take a maximum of 2 setups per day.
This ensures quality over quantity, preventing overtrading.
Taking more than 2 setups increases the risk of forcing trades instead of following confluences.
If the first setup wins, you can still take the second trade if a high-probability setup appears.
If both setups are taken, stop trading for the day, even if more opportunities arise.

📌 Final Rule: Stick to a maximum of 2 setups per day to maintain discipline and consistency.

Question: How many set ups per month?

Answer: 
We take a maximum of 20 set ups per month.

Question: What’s the exit criteria for any trader according to CLF strategy?

Answer:
Our strategy defines clear exit criteria as follows:
✅ Primary Exit Criteria (Take-Profit Targets):
1:5 Risk-to-Reward ratio (15-pip SL → 75-pip TP)
Index gaps (If present, these serve as optimal targets.)

✅ Secondary Exit Criteria:
Partial Closure: Close 25% of your trade at 28-30 pips, as historically, price reaches this level 85% of the time.
Time-based Closure: If your trade hasn't reached the target, close at 9:30 PM UK time to avoid market volatility and spreads increasing during the Asia session.

📌 Final Rule:
Main exit: 1:5 Risk-to-Reward or Index Gaps.
Secondary exits: Partial close at 28-30 pips, full closure by 9:30 PM UK time if TP not reached.


Question: What pairs do we trade?

Answer: At CLF we stick to GBPUSD (GU)

Question: Do i move my stop loss (SL) to break even (BE)?

Answer:
We should never move our Stop Loss to BreakEven (BE)
We close 25% of our trade when price reaches 28-30 pips.

[PROMPT_ID: DISC_001]
`;

// Balance Prompt
export const BALANCE_PROMPT = `
Questions:

Can price respect areas AGAIN such as FV, top of balance, bottom of balance etc and use them as confluences, or is it once they have been respected you cannot use again?
How and when is FV used as a confluence? How many times can it be re used?

Answer:
Can Price Respect Areas Again (FV, Top/Bottom of Balance) and Use Them as Confluences?

Yes, price can respect areas like Fair Value (FV), Top of Balance, and Bottom of Balance multiple times, but we only trade on the first touch. 
Here is why:

Key Points:
1️.First Touch is the Best Trade Opportunity
Data from GBP/USD tests shows that the first touch at these levels gives the cleanest and most reliable trade setups.
Fair Value (FV), Top of Balance, and Bottom of Balance tend to have the strongest reaction on the first test.
2️.Second Test Can Sometimes Work, But with Less Confidence
The second test may still provide a reaction, but it is weaker and less predictable.
Liquidity and market interest decrease after the first touch.
3️.We Use Confluences for Entries at These Points
When price first touches FV, Top of Balance, or Bottom of Balance, we combine it with confluences for higher probability trades.
This follows the Balanced Market Blueprint taught in class.

Trading Guidelines:
-Trade only on the first touch of FV, Top of Balance, or Bottom of Balance.
-Use confluences (like price action, market structure, liquidity sweeps) to confirm your entries.
-Be cautious of second or third tests, as their effectiveness drops significantly.
-Avoid trading these areas if price has already touched them multiple times.

Final Takeaway:
-Price can respect these areas multiple times, but we only trade on the first touch for the highest probability setups.
-Second tests might still work, but they are less reliable compared to the first touch.
Follow the Balanced Market Blueprint and always use confluences to confirm trades.


Question:
What confluences can be used in a balanced market?

Answer:
In a balanced market, we follow the Balance Blueprint to identify high-probability trade setups. The most commonly used confluences are:
-R1 & R2 (Resistance Levels) – Key areas where price is likely to reject in a range-bound market.
-S1 & S2 (Support Levels) – Strong buy zones within balance where price often reacts.
-78% Fibonacci Retracement – A key retracement level that aligns with liquidity and institutional interest.
-IBL (Invalid Banking Levels) – Used as secondary confluence points for precision entries.

Final Rule: Use at least two confluences per trade in a balanced market to confirm high-probability setups.


Question:
Can you take a trade from fair value if the apm for the day is already complete and exceeded?

Answer:
Yes, you can take a Fair Value (FV) trade, but it must have a valid confluence, ideally a pivot.
-If APM has already been exceeded, the market may be overextended, so extra caution is needed.
-Fair Value trades in this situation typically yield around 30 pips, but they require proper trade management because they are trading against the trend.

Final Rule: You can take an FV trade after APM is exceeded, but only with a strong confluence (preferably a pivot) and correct risk management.


Question:
On the 15M timeframe, when looking for entries, does an Invalid Banking Level (IBL) still need to be three digits to be considered a confluence?

Answer:
Yes, IBLs and VBLs always have "0000" after the third digit.
-This means the level must be structured as X.XX0000 for it to be a valid confluence.
-If the level does not follow this structure, it should not be considered as an IBL confluence.

Final Rule: When using IBLs as a confluence on the 15M timeframe, always check that they have three digits followed by "0000" to confirm validity.


Question:
In balanced markets, the pivot point is invalid. But if price opens above or below the pivot at 7 AM, does this still indicate a bullish or bearish direction for the day? Or is this invalid too?

Answer:
If the pivot is invalid, then do not trade.
The pivot must be valid to be considered a confluence for direction.
If price opens above or below an invalid pivot, it does not indicate a bullish or bearish direction for the day.
We do not use pivot direction bias inside a balanced market because there is no short-term trend—pivot bias is only relevant in an imbalanced market.
However, if price is transacting above the pivot, it means buyers are in control short term, and if price is below the pivot, sellers are in control.

Do not try to force a bias from an invalid pivot—simply step away from the trade.

Final Rule: If the pivot is invalid, avoid trading for the day.


Question:
How to identify the direction of the market?

Answer:
How to Identify the Direction of the Market
Identifying market direction is key to making informed trading decisions. Here's a step-by-step process to determine the market direction and align your trades accordingly.

Step 1: Use the 4H Timeframe for Directional Bias:
-The 4-hour (4H) chart helps identify the mid-term market trend.
-We analyse the directional break of balance to confirm whether the market is trending bullish or bearish.

Step 2: Identify a Break of Balance:
-If price breaks below the balance zone → Sellers are in control → Look for selling opportunities.
-If price breaks above the balance zone → Buyers are in control → Look for buying opportunities.
-If price stays within balance → No clear direction → Trade it as a Balanced market.

Step 3: Execute Trades on the 15-Minute Timeframe:
Once you have a mid-term bias from the 4H timeframe, move to the 15-minute (15M) timeframe for trade execution:
If 4H is bearish, look for sell setups on the 15M timeframe.
If 4H is bullish, look for buy setups on the 15M timeframe.

If 4H is in balance (ranging market), treat it as a range trade:
-Buy near the bottom of balance.
-Sell near the top of balance.
-Always use additional confluences (like price action, key levels, or indicators) for confirmation.

Key Takeaways:
-4H timeframe = Mid-term trend
-Directional break of balance = Market trend confirmation
-15M timeframe = Entry and execution
-Trade in the direction of the trend OR range-trade within balance if no breakout occurs.


Question:
How do you identify a valid balance?

Answer:
A valid balance is identified on the 4H timeframe.
To confirm a valid balance, price must have:
-Two failed touches at the top (resistance rejection).
-Two failed touches at the bottom (support rejection).

Final Rule: If price meets these conditions on the 4H timeframe, it confirms a valid balanced market structure.


Question:
When should I mark a balance? How do I determine if the current price is now in a balance? What are the conditions for a valid balance?

Answer:
-A balance should be marked when the market structure meets the conditions of a valid range.
-Balance is always identified on the 4H timeframe.

Conditions for a Valid Balance:
1️.Two failed touches at the top (resistance rejection).
2️.Two failed touches at the bottom (support rejection).
3️.Price is moving sideways with no clear trend.
4️.No significant breakout past the high or low.

Final Rule: A balance is confirmed when price has formed a clear range on the 4H timeframe, with at least two failed attempts at both support and resistance.

Question: How do I know if price has broken balance? What timeframe do we use?

Answer:
Price has broken balance when it transacts outside the balance box.
If price moves outside the balance range, it indicates a potential breakout.
For confirmation, let two candles close outside the balance box.
If you are unsure whether the breakout is valid, wait for two full candle closes outside the balance range.
Use the 4H timeframe to confirm balance breaks.
The 4H chart provides the best structure for identifying balance and detecting clean breakouts.

Final Rule: A balance break is confirmed when two 4H candles close outside the range. If price is just testing outside but not closing, the balance is still valid.


Question: What timeframe do we use to determine if TOB (Top of Balance) or BOB (Bottom of Balance) have been tested, or if price has broken balance? Price broke on the 15M, but only wicked on the 4H.

Answer:
The 4H timeframe is used to confirm if TOB or BOB have been tested or if balance has been broken.
The 15M timeframe may show price breaking balance, but this is not enough for confirmation.
If price only wicks outside balance on the 4H, then balance is still intact and has not been broken.

How to Confirm a Balance Break:
1)If price only wicks outside on the 4H, the balance is still valid.
2)If two full 4H candles close outside the balance box, the break is confirmed.

Final Rule: The 4H timeframe is the confirmation for balance breaks. If price breaks on the 15M but only wicks on the 4H, the balance is still valid.


Question: Confusion about balance or imbalance when price range is there but touches are not clear.

Answer:
The market is either in balance or imbalance—there is no in-between.

1)Balanced Market:
Price is moving sideways between a well-defined support and resistance.
There must be at least two failed touches at the top and two failed touches at the bottom.
There is no clear trend, meaning buyers and sellers are in equilibrium.

2)Imbalanced Market:
Price is breaking out in a clear direction (uptrend or downtrend).
Strong momentum, with large candles and minimal retracements.
Price does not stay within a confined range but continues pushing in one direction.

Final Rule: If price has two clear rejections on both sides, it's a balance. If price is trending and breaking structure, it's an imbalance. There is no middle ground.


Question: If the 4H balance is not clear, can we see balance on the 1H? What timeframe should we use?"

Answer:
No, always use the 4H timeframe to confirm balance.
The 4H timeframe is the most reliable because it filters out lower timeframe noise and shows true market structure.

Final Rule: If balance is not clear on the 4H, do not try to force it on the 1H. Stick to the 4H as it works best.

Question: When do we rearrange the balance box?

Answer:
You can adjust the balance box if price transacts slightly outside of it and then returns to balance.
Sometimes, price may briefly move outside the balance range before coming back in, requiring an adjustment.
Ensure the balance box averages through all the relevant candles to maintain accuracy.

Final Rule: Rearrange the balance box only when price shows a minor breakout and returns, making sure the box correctly reflects the range.

Question: How to use Fibonacci (Fib) in an Imbalanced Market?

Answer:
Fibonacci is used as a secondary confluence in an imbalanced market.

Step-by-Step Process:
1️. Identify if the market is imbalanced on the 4H timeframe.
Determine if buyers or sellers are in control.
If buyers are in control, look for buy setups.
If sellers are in control, look for sell setups.

2️. Go to the 15-minute (15M) timeframe and look for trade opportunities in the direction of the trend.
Use your primary confluence to find a valid trade setup.
Pair it with Fibonacci as your secondary confluence.

3️. Apply the Fibonacci retracement tool for entry confirmation.
Mark the high of the swing to the low of the swing on the 15M timeframe.
Use only the 61% Fib level as your secondary confluence for entry.

Final Rule: Fibonacci should always be used as a secondary confluence in an imbalanced market, not the primary reason for entry.

Question: Can we use a Fibonacci level if it has been tapped multiple times?

Answer:
✅ General Rule:
Ideally, a Fibonacci retracement level (61% or 78%) is strongest on the first touch.
The more times price touches a specific Fibonacci level, the weaker the level becomes.
✅ Guidelines for Multiple Taps:
First Touch: Highest probability for accurate trade entry.
Second Touch: Can still work, but with slightly reduced reliability.
Third Touch or More: The probability of the level holding significantly decreases. The Fibonacci level is considered weak or invalidated, so trades at these points become riskier.

📌 Final Rule:
Preferably enter on the first or second touch of a Fibonacci level.
Avoid entries after multiple taps (3 or more), as reliability significantly declines.

Additional Information (Fibonacci Section):
✅ Fibonacci Levels we use:
Balanced Market: 78% Fibonacci retracement
Imbalanced Market: 61% Fibonacci retracement
✅ How we plot Fibonacci:
Always plotted on 15-minute timeframe
Swing High to Swing Low (for bullish retracements)
Swing Low to Swing High (for bearish retracements)
✅ Usage in Trade Strategy:
Always used as a secondary confluence
Pair with a primary confluence such as Pivot points (imbalanced market) or R1, R2, S1, S2 (balanced market)


Question: Can we use fibs on DXY?

Answer: No we don't.

Question: When analysing imbalances, do you take into account imbalanced wicks, or should I only consider the imbalanced body?

Answer:
We only consider the imbalanced body, not the wicks.
Imbalances are identified using the candle body on the 4H timeframe—not the wicks.
Wicks represent smaller liquidity voids, but they are not classified as full imbalances.
If the body of the imbalance candle has been filled by at least 80%, then the imbalance is considered completed.

Final Rule: When analysing imbalances, focus on the candle body and disregard wicks when marking imbalances.

Question: What's the minimum and maximum size of balance?

Answer:
Minimum balance size: 60 pips
Maximum balance size: 220 pips

A valid balance must be between 60 and 220 pips in height.
If the range is below 60 pips, the market is too tight and not considered a proper balance.
If the range is above 220 pips, the market is too volatile and may indicate an imbalance instead.

📌 Final Rule: A balance is only valid if it falls between 60 and 220 pips in height.

Question: What confluences should I use in an imbalanced market?

Answer:
In an imbalanced market, we use the following confluences:
✅ Primary Entry Confluence:
Pivot Point → The main level used to confirm trade direction in an imbalanced market.
✅ Secondary Confluences:
61% Fibonacci Retracement → Used to refine entries in trending conditions.
IBL (Invalid Banking Level) → Acts as additional confirmation for price reaction points.
200 MA (Moving Average) → Helps validate the trend direction and provides dynamic support/resistance.
✅ Target Confluences:
Index Gaps → If present, they can act as a final target level.
1:5 Risk-to-Reward Ratio → Ensures trades are executed with proper risk management.
📌 Final Rule: In an imbalanced market, the Pivot Point is the primary entry confluence, while Fibonacci (61%), IBL, and the 200 MA serve as secondary confluences. Targets can be set using index gaps or a 1:5 risk-to-reward ratio.

Question: What confluences do I use in a balanced market?"

Answer:
In a balanced market, we use the following confluences:
✅ Primary Entry Confluence:
R1, R2, S1, or S2 → These pivot levels act as the main decision points for trade entries.
✅ Secondary Confluences:
Bottom or Top of Balance → Confirms that price is reacting at the key balance range.
IBL (Invalid Banking Level) → Acts as an additional confluence to refine entries.
78% Fibonacci Retracement → Provides extra confirmation for entry when aligned with other confluences.
✅ Target Confluences:
Index Gaps → If available, they can act as final take-profit targets.
1:5 Risk-to-Reward Ratio → Ensures trades follow the correct risk management structure.
📌 Final Rule: In a balanced market, we buy from the bottom and sell from the top, but only if R1 or R2 is at the top, and S1 or S2 is at the bottom. The trade setup must have at least one primary confluence and one secondary confluence for confirmation.

Question: How to measure balance

Answer:
We measure balance from wick to wick, if the balance is small. If it's big we can average it out.

Question: How many pips does price have to move beyond balance before we consider it broken?

Answer:
✅ Important:
We do not base balance breaks solely on pip distance.
A balance break is confirmed by two full candle closes on the 4-hour timeframe, clearly outside the Top or Bottom of the balance range.
✅ Key rule for confirming balance breaks:
Two consecutive 4-hour candles must close fully outside the established balance area.
A single candle or wick moving outside the balance area does NOT confirm a break.

📌 Final Rule:
Balance is only confirmed broken after two complete 4-hour candles close beyond the balance boundaries. Do not rely on pip measurements alone.

Question:
How many confluences are needed to take a trade?

Answer:
There should be a minimum of 2 confluences. You can not have less than 2 confluences it is never ok to have 1 confluences , you need minimum 2 confluences , but at CLF more confluences doesn't necessarily always mean better. So manage your risk correctly.

[PROMPT_ID: BAL_001]
`;

// Banking Levels Prompt
export const BANKING_LEVELS_PROMPT = `
1) IBL - Invalid Banking Level
Questions:
Question1:Whats an invalid banking level?
Question 2:when looking at Invalid Banking Levels do we apply the coordinates rules as Major and Minor BL?

Answer:
What is an Invalid Banking Level (IBL)?
An Invalid Banking Level (IBL) refers to round numbers that exist between Major and Minor Support & Resistance levels.
Step-by-Step Explanation

Understand the Banking Levels:
Major Banking Levels: These are strong support and resistance levels, typically at big round numbers (e.g., 1.07000, 1.42000 for GBP/USD).
Minor Banking Levels: These are smaller but still significant levels (e.g., 1.20000, 1.33000 for GBP/USD).
These are called Valid Banking Levels (VBL).

Identifying Invalid Banking Levels (IBL):
Any round number between a Major and Minor banking level is an Invalid Banking Level.
Example:
Minor Support: 1.20000 (Valid Banking Level)
Numbers above it like 1.21000, 1.22000, 1.23000... up to Minor Resistance (1.33000) are Invalid Banking Levels.

How They Are Structured:
Order of Levels (GBP/USD Example - Jan 2025)
Major Support – 1.07000 (VBL)
Minor Support – 1.20000 (VBL)
Minor Resistance – 1.33000 (VBL)
Major Resistance – 1.42000 (VBL)
Any round number in between these levels is an IBL.

Why Are They Called Invalid?:
These levels are not strong support/resistance zones but can still have price reactions.
They are mainly used to track price movement between strong banking levels.

Final Thoughts:
Valid Banking Levels (VBL) = Major & Minor Support/Resistance levels.
Invalid Banking Levels (IBL) = Round numbers between the VBLs.
Traders use IBLs for intraday price action, but major reversals usually happen at VBLs.

Main Keywords:
-Invalid Banking Level
-IBL
-Banking Levels
-Round Numbers
-Support and Resistance

Alternative Ways Students May Ask This Question
To ensure you cover different ways students might phrase their question, here are multiple variations:

Basic Rewording:
-What is an invalid banking level?
-Can you explain IBL in trading?
-What does IBL mean in forex?
-What are invalid banking levels?

Conceptual Questions:
-How do I know if a banking level is valid or invalid?
-What makes a banking level invalid?
-Why are some round numbers not strong support/resistance?
-How do invalid banking levels affect price action?
-Are invalid banking levels important in trading?
-Should I trade at invalid banking levels?

Application-Based Questions:
-How do I identify an invalid banking level?
-What are the invalid banking levels for GBP/USD right now?
-How do I use invalid banking levels in my trading strategy?
-Can I use IBLs for scalping or day trading?
-How do invalid banking levels relate to major and minor support/resistance?

Comparison Questions:
-What is the difference between a valid and invalid banking level?
-How do invalid banking levels compare to institutional levels?
-Do major banks use invalid banking levels?
-Are IBLs the same as psychological levels?
-Is an invalid banking level weaker than a valid banking level?

Question:
As far as IBL, I see you use them often. Can we use these as entry points with imbalance as well? Also, is the thousands stronger than the hundreds (vice versa)?

Answer:
Using IBL as an Entry Point – Always Needs a Pivot
-Invalid Banking Levels (IBL) can be used as entry points, but they must always be paired with a Pivot as the primary confluence.
-The Pivot is mandatory for confirming the trade, while IBL serves as a secondary confluence to strengthen the entry.

This Rule Applies to All Secondary Confluences:
-Open Orders
-Fibonacci Levels
-Moving Averages
-IBL (Invalid Banking Levels)
-Gaps

The Pivot must be there at all times for the trade setup to be valid. The secondary confluences help increase probability but should not be used alone.

Which is Stronger: Thousands or Hundreds?
-Thousands (e.g., 1.20000, 1.30000, 1.40000) are stronger than Hundreds (e.g., 1.21000, 1.22000, 1.23000).
-Thousands act as psychological levels with stronger institutional influence.
-Hundreds can still be respected but are considered weaker in comparison.

Final Takeaways:
-IBLs can be used for trade entries, but they must always be paired with a Pivot as the primary confluence.
-Thousands are stronger than hundreds, making them more reliable for price reactions.
-Always stack confluences for higher probability trades—IBLs alone are not enough.

Keywords to Trigger This Response:
-Invalid Banking Level (IBL)
-IBL trade entry
-Using IBL for confluence
-IBL and Pivot
-Psychological levels
-Thousands vs. Hundreds trading levels
-Key levels for trade entry
-IBL strength comparison

Alternative Ways This Question May Be Asked:
-Can I use IBLs for trade entries?
-Do IBLs work well with pivots?
-Do I need a pivot to trade IBL?
-What is more important: an IBL or a pivot?
-Can IBLs be used as strong support/resistance?
-How often do IBLs get respected in trading?
-What is the best confluence for using IBLs in trade entries?


2) VBL - Valid Banking Level
Question:
My questions is not what is banking levels or invalid banking levels, I am asking what is the technical difference between the two.

Answer:
The technical difference between Valid Banking Levels (VBL) and Invalid Banking Levels (IBL) lies in their strength, usage, and institutional relevance.

Valid Banking Levels (VBL) represent major institutional price zones where banks and large financial institutions place their orders. These levels act as long-term targets rather than immediate trade entries. We do not trade directly at VBLs because institutions are often reloading or adding new orders at these points, which makes price movements unreliable and often results in a balanced market. If price is at a VBL, its best to wait for confirmation rather than entering immediately.

On the other hand, Invalid Banking Levels (IBL) are round numbers that sit between major and minor support/resistance levels. These levels are considered secondary confluences and should always be used in combination with a Pivot to validate trade entries. Unlike VBLs, which serve as long-term reference points, IBLs can be used for short-term trade setups when combined with other factors such as imbalances, Fibonacci retracements and pivots.

Key Takeaways:
-VBLs are major institutional levels and should be used as long-term targets, not entry points.
-IBLs are weaker levels and should only be used for entries when combined with pivots and other confluences.
-Institutions reload orders at VBLs, making price action unreliable in those areas.
-IBLs can provide trade opportunities, but they must always be supported by a pivot as the primary confluence.

Keywords to Trigger This Response:
-Valid Banking Level (VBL)
-Invalid Banking Level (IBL)
-VBL vs. IBL difference
-Using VBL as a target
-Banking levels in trading
-Institutional orders at VBLs
-Trading IBL with pivot
-IBL entry confluences

Alternative Ways This Question May Be Asked:
-What is the technical difference between VBL and IBL?
-Should I trade directly at a VBL?
-Why are VBLs used as long-term targets and not entry points?
-Are IBLs weaker than VBLs?
-How do banking levels affect price action?
-When should I use a VBL vs. an IBL in trading?
-Do institutional traders respect IBLs?
-What makes a VBL a stronger level than an IBL?
-Should I trade at an IBL without a pivot?
-Why do institutions reload orders at VBLs?

[PROMPT_ID: BANK_001]
`;

// Moving Average Prompt
export const MOVING_AVERAGE_PROMPT = `
Question:
What time frame do we use MA's?

Answer:
We use the 200 Moving Average (200MA) as a secondary confluence, not as a primary trading confluence. The only time frame we use for entries is the 15-minute (15M) chart, and the 200MA is applied to this timeframe.

Key Rules for Using the 200MA in Our Strategy:
-Used as a secondary confluence, not the main reason for taking a trade.
-Only applied to the 15-minute time frame.
-All trade entries are based on the 15-minute chart.

If price aligns with the 200MA on the 15M chart and other confluences (such as pivots, imbalances, or IBLs), it can be used as a confirmation for entries.
Keywords to Trigger This Response:
-Moving Average (MA) time frame
-Best time frame for MAs
-15M Moving Average strategy
-Using 200MA for trade entries
-TradingView MA settings
-MA confluence in trading
-200MA for short-term trades

Alternative Ways This Question May Be Asked:
-What time frame should I use for Moving Averages?
-Do we use MAs on higher timeframes?
-Can I enter a trade using the 200MA?
-What is the best time frame for the 200 Moving Average?
-Do we use MA as a main confluence?
-Can I use the MA on the 4H or 1D chart?
-Why do we only use the 15-minute time frame for the MA?
-What is the best use of the 200MA in our trading strategy?
-Should I use the 200MA for exits as well as entries?
-Can I trade without using the 200MA?

Question:
Can someone please share the setting for EMA?
What "source & offset" should we use for our 50 & 200 MA indicator?

Answer:
We use the following Moving Average (MA) indicator on TradingView:

Moving Average 50/200 on TradingView
How to Set It Up:
1️. Open TradingView and add the Moving Average 50/200 indicator.
2️. In the settings, tick only one MA and change the settings as follows:
Length: 200
Color: Black
3. Click OK to save and apply the settings.
Now your 200MA is set up correctly for use in our trading strategy!

Keywords to Trigger This Response:
-EMA settings
-Moving Average setup
-TradingView MA indicator
-200MA configuration
-Best MA settings for trading
-How to set up moving averages
-MA TradingView settings
-50/200 Moving Average

Alternative Ways This Question May Be Asked:
-What are the settings for EMA?
-How do I set up my moving average on TradingView?
-What is the correct Moving Average indicator for our strategy?
-How do I change the length of the Moving Average?
-What settings should I use for the 200MA?
-How do I add a black 200MA to my chart?
-Can I use a different MA length instead of 200?
-Do I need both 50 and 200 MAs, or just one?
-What is the best TradingView indicator for MAs?
-How do I configure the 200 Moving Average on TradingView?


Question:
When do we say dynamic indicators such as 200 ma are invalid for entries?

Answer:
We use dynamic indicators like the 200 Moving Average (MA) as a secondary confluence when the midterm market is imbalanced.

Time Frame: Always use the 15-minute (15M) chart for entries.
When It is Invalid: If the midterm market is balanced, the 200MA should not be used for entries because it loses its relevance in balanced conditions.
Remember, this is only a secondary confluence, so you should never rely solely on the 200MA for making trade decisions.

Key Takeaways:
-Use the 200MA only when the midterm market is imbalanced.
-Apply it on the 15M timeframe and always combine it with a primary confluence (e.g., pivot).
-Do not use the 200MA as a standalone entry trigger—it is a secondary confluence.

Keywords to Trigger This Response:
-200MA invalid for entries
-Dynamic indicators in trading
-200 Moving Average as secondary confluence
-Using 200MA in imbalance
-When not to use 200MA

Alternative Ways This Question May Be Asked:
-When is the 200MA invalid as a confluence?
-Do we always use the 200 Moving Average for entries?
-Should I avoid using the 200MA in a balanced market?
-When should I rely on the 200MA for trades?
-What makes dynamic indicators like the 200MA unreliable?
-Is the 200MA valid in balanced markets?
-Can I use the 200MA as my main confluence?
-Why is the 200MA only used in an imbalanced midterm market?
-Should I still follow the 200MA if the market is consolidating?
-How do I know when to ignore the 200MA for entries?


Question: MA crossing each other or price, MA rejections—do I enter?

Answer:
✅ We only use the 200 Moving Average (200 MA) as a secondary confluence in an imbalanced market.

✅ Entry rule:
As soon as price touches the 200 MA, enter immediately.
Do not wait for MA crossovers or candle rejections; this approach risks missing valuable pips.

📌 Final Rule: Stick strictly to the 200 MA touch for entries. Do not rely on MA crossovers or rejections.

Question: Do I trade if price keeps testing or rejecting the 200 MA?

Answer:
✅ We use the 200 MA primarily as a secondary confluence in an imbalanced market. 
✅ First touch of the 200 MA typically provides the strongest reaction and highest-probability entry.
✅ If price repeatedly tests the 200 MA (second, third, or more), the probability of the MA holding decreases significantly.
✅ While the second test might still work, multiple tests generally signal reduced reliability.

Ideal Approach:
Enter trades ideally on the first test of the 200 MA.

Avoid multiple re-tests, as repeated tests may weaken the MA as a confluence, increasing risk.
📌 Final Rule: The first touch of the 200 MA is the highest-probability trade. Multiple rejections can lead to weaker and less predictable outcomes.

[PROMPT_ID: MA_001]
`;

// Currency Mapping Prompt
export const CURRENCY_MAPPING_PROMPT = `
Question:
I need a little bit of help to understand mapping. Yesterday, I was trying to map neutral, bullish, and bearish, but my TradingView account was reset and I lost my templates. How can I map the candles to calculate the APM?

Answer:
Step 1: Understanding Currency Mapping
Currency Mapping consists of three different projections:
Bullish Map → Forecasts the upside movement for the day.
Natural Map → Represents a neutral (balanced) forecast.
Bearish Map → Forecasts the downside movement for the day.

Step 2: Rebuilding Your APM Calculation on TradingView
Since your TradingView templates were lost, you need to manually remap the candles to calculate the APM (Average Price Movement):
1️.Measure the last five daily candles (wick-to-wick).
2️.Add up the total pip movement.
3️.Divide by five to get today's estimated APM.
This will give you a realistic projection of how far price can move today.

Step 3: Applying Currency Mapping with APM
Use the APM value as the projected range for all three maps (Bullish, Neutral, and Bearish).
Eliminate the map that does not fit the market state:
If the market is imbalanced, remove the map that goes against the direction.
If the market is balanced, remove the one that does not match the phase.

Key Takeaway: You can remap your candles manually using APM and apply it to Currency Mapping. Always keep the two most relevant maps based on market conditions and eliminate the one that doesn't fit.

Alternative Ways This Question May Be Asked:
-How do I remap my candles for APM?
-I lost my TradingView templates. How do I reset my currency mapping?
-What are the three maps in currency mapping?
-How do I use APM for bullish and bearish projections?
-Which currency map should I remove in a balanced market?
-How do I calculate APM manually?
-Should I use all three currency maps, or remove one?
-How do I align APM with currency mapping?

Keywords to Trigger This Response:
-Currency mapping reset
-How to map APM manually
-Bullish, Neutral, Bearish map calculation
-How to forecast daily movement
-How to eliminate a currency map
-Using APM in trading
-Manual currency mapping process

[PROMPT_ID: MAP_001]
`;

// Confluences Prompt
export const CONFLUENCES_PROMPT = `
Question:
How to decide which set up to take when they are close (example: s1/61fib , s278fib)?

Answer:

Step 1: Only One Setup Per Pivot
You should only take one setup per pivot—not multiple trades at the same pivot level.
The selected pivot must have at least one confluence, meaning a minimum of two confluences total (Pivot + at least one additional confluence).

Step 2: Confluence Must Be Within Stop Loss Range
The second confluence should ideally be within your stop-loss range to keep risk managed.
If the second confluence is within your take-profit (TP) range, it can still be counted, but it must be adequately positioned to ensure a strong trade setup.
A general guideline: If your second confluence is around 10 pips above the primary entry confluence, it's still valid.

Final Rule: Choose only one setup per pivot, ensuring it has at least one strong confluence within your SL or a valid secondary confluence within TP range.

Keywords to Trigger This Response:
-Choosing between trade setups
-Multiple setups at the same pivot
-S1/61 Fib vs. S278 Fib decision
-How to filter strong setups
-Valid confluence within stop loss
-Trading setups close together
-Which confluence to prioritize
-One trade per pivot rule

Alternative Ways This Question May Be Asked:
-How do I choose between two setups that are close?
-Should I take multiple setups at the same pivot?
-How do I decide between S1/61 Fib and S278 Fib?
-What is the best way to filter out weak setups?
-Can I take two trades from the same pivot?
-Does my second confluence need to be within SL or TP range?
-How do I know which confluence is stronger?
-What if my second confluence is slightly above my entry?
-Should I ignore a setup if confluences are spread apart?
-How do I structure my trades when setups are close together?

Question:
How many confluences are needed to take a trade?

Answer:
There should be a minimum of 2 confluences. You can not have less than 2 confluences it is never ok to have 1 confluences , you need minimum 2 confluences , but at CLF more confluences doesn't necessarily always mean better. So manage your risk correctly.

Question: What confluences should I use in an imbalanced market?

Answer:
In an imbalanced market, we use the following confluences:
✅ Primary Entry Confluence:
Pivot Point → The main level used to confirm trade direction in an imbalanced market.
✅ Secondary Confluences:
61% Fibonacci Retracement → Used to refine entries in trending conditions.
IBL (Invalid Banking Level) → Acts as additional confirmation for price reaction points.
200 MA (Moving Average) → Helps validate the trend direction and provides dynamic support/resistance.
✅ Target Confluences:
Index Gaps → If present, they can act as a final target level.
1:5 Risk-to-Reward Ratio → Ensures trades are executed with proper risk management.
📌 Final Rule: In an imbalanced market, the Pivot Point is the primary entry confluence, while Fibonacci (61%), IBL, and the 200 MA serve as secondary confluences. Targets can be set using index gaps or a 1:5 risk-to-reward ratio.

Question: What confluences do I use in a balanced market?"

Answer:
In a balanced market, we use the following confluences:
✅ Primary Entry Confluence:
R1, R2, S1, or S2 → These pivot levels act as the main decision points for trade entries.
✅ Secondary Confluences:
Bottom or Top of Balance → Confirms that price is reacting at the key balance range.
IBL (Invalid Banking Level) → Acts as an additional confluence to refine entries.
78% Fibonacci Retracement → Provides extra confirmation for entry when aligned with other confluences.
✅ Target Confluences:
Index Gaps → If available, they can act as final take-profit targets.
1:5 Risk-to-Reward Ratio → Ensures trades follow the correct risk management structure.
📌 Final Rule: In a balanced market, we buy from the bottom and sell from the top, but only if R1 or R2 is at the top, and S1 or S2 is at the bottom. The trade setup must have at least one primary confluence and one secondary confluence for confirmation.


[PROMPT_ID: CONF_001]
`;

// Trends Prompt
export const TRENDS_PROMPT = `
Question:
How big of a trend do we look for the current day if the midterm price is in an uptrend, but we are currently in a balanced market?

Answer:
To determine how far price can move in a day, we use APM (Average Price Movement) and Currency Mapping to project potential daily movement.

Step 1: Identify Market State on the 4H
The 4H timeframe determines whether the market is balanced or imbalanced—not just the trend.
If the market is balanced, we should only buy from the bottom of the range with at least two confluences.
If the market is imbalanced, we follow the trend and look for entries in the direction of movement.

Step 2: Use APM & Currency Mapping for Projections
APM (Average Price Movement) helps us estimate the daily range based on historical movement.
Currency Mapping helps identify whether we expect a bullish, neutral, or bearish outcome for the day.
These two factors give realistic expectations for how far the market may move in a day.

Key Takeaway: The question assumes that the market is both in an uptrend and balanced, but this is incorrect. The 4H structure determines balance or imbalance. If it's balanced, we buy from the bottom of the range using confluences and use Currency Mapping to project movement.

Keywords to Trigger This Response:
-APM daily projection
-Currency Mapping trend analysis
-Midterm uptrend but balanced market
-4H balance vs. daily trend
-How far can price move today?
-Daily price range estimation
Trading in balance with midterm trend

Alternative Ways This Question May Be Asked:
-How do we know how far price will move today?
-What is the daily trend size based on APM?
-Can we expect a big move if the midterm is bullish but we are balanced?
-Do we enter only at the bottom of balance, or can we trade breakouts?
-What tools can we use to project daily price movement?
-How does Currency Mapping help in day trading?


Question:
Confusion about market state, balance or imbalance?

Answer:
To determine whether the market is in a balance or imbalance state, we always analyse the 4-hour (4H) timeframe.
How to Identify Market State on the 4H:

Balanced Market (Consolidation / Range):
Price is moving sideways between a well-defined support and resistance.
There are multiple rejections at both the top and bottom of the range.
The market lacks strong directional momentum, meaning buyers and sellers are in equilibrium.
Price often respects previous levels and moves within a confined zone.

Imbalanced Market (Trending / Expanding Move):
Price is breaking out in a clear directional move (uptrend or downtrend).
Candles have strong bodies with little to no wicks, indicating momentum.
Price is consistently making new highs or new lows without returning to previous levels.
The market has clear one-sided control, meaning either buyers or sellers are dominating.

Final Rule: Always check the 4H timeframe first to determine whether the market is in balance (ranging) or imbalance (trending). This will guide trade decisions and confluences.

Keywords to Trigger This Response:
-Balanced vs. imbalanced market
-How to identify market state
-4H balance vs. imbalance
-Market trending or ranging?
-Is the market in consolidation?
-How to confirm a trending market

Alternative Ways This Question May Be Asked:
-How do I know if the market is balanced or imbalanced?
-What is the best way to tell if the market is ranging or trending?
-Should I trade differently in a balanced vs. imbalanced market?
-What timeframe do we use to check market state?
-Is the market in a consolidation or a breakout phase?
-How do I confirm if we are in an imbalanced market?
-What signs show that the market is balanced?
-When should I expect a market shift from balance to imbalance?

Question: What's the highest timeframe we use and how do we use each timeframe?

Answer:
✅ 1 Month (Monthly timeframe)
Identifies Major Support and Resistance levels.
Provides long-term, major market structure.
✅ 1D (Daily timeframe):
Identifies Minor Support and Resistance levels.
Used for determining Average Price Movement (APM) and long-term directional bias.
✅ 4H timeframe (Mid-term Analysis):
Identifies balanced or imbalanced market conditions.
Used to plot and track index gaps.
✅ 15-minute timeframe (Short-term Execution):
Used to plan and execute trades precisely.
Determines exact entry and exit points.

📌 Final Rule:
Monthly & Daily: Identify major/minor S/R levels
4H: Structure & Gaps
15M: Execution & Setup Planning

[PROMPT_ID: TREND_001]
`;

// Eliot Wave Prompt
export const ELIOT_WAVE_PROMPT = `
Question: Eliot?:

Answer:
Elliot Wave Analysis
The Elliot Wave Theory is used to identify & predict a long term trend with precision. 
When drawing the Elliot Wave you must start from a Valid Banking Level.

You should only apply on GBP/USD & apply it on the Long Term time frame such as the 1-Day time frame.

Here is the Elliot Wave Key:
Must start from a banking level

Elliot Waves Key:
Wave Start   Wave End    Fib Level   WaveType
0-1                      2                23-61%     Pullback
1-0                      3                 161%        Target
2-3                      4                23-61%     Pullback
3-2                      5                 161%        Target

Notes:
• Must start from banking level
• We use the wave as a confirmation of direction (long term)
• GU should respect the wave pullback
•We can only apply it to the upside
 •After wave 5 is formed we can see a ABC correction wave

[PROMPT_ID: ELIOT_001]
`;

// Candles Prompt
export const CANDLES_PROMPT = `
1)Price Action:

Question:
how you monitor price action when you enter trades? do you watch on the 15m and enter off on the first candle showing signs of rejection or on the retest candle if it gets one?

Question:
Do you personally wait for candle closure before jump into a trade?

Answers:
"How do you monitor price action when you enter trades? Do you watch on the 15M and enter on the first candle showing signs of rejection or on the retest candle if it gets one?"
Answer:
-We always use the 15-minute (15M) timeframe for entries.
-We enter as soon as price hits our entry point—we do not wait for candle closures.
-While waiting for a candle close might seem safer, it can cause missed opportunities if price touches the entry and moves in our direction immediately.
-If price rejects and provides a retest, we can still take the entry if confluences align.

Final Rule: We enter as soon as price reaches the level, instead of waiting for confirmation candles, to avoid missing quick moves.

Alternative Ways This Question May Be Asked:
-Should I wait for candle closure before entering a trade?
-Do we enter on the first rejection candle or on a retest?
-What is the best way to monitor price action for trade entries?
-Should I wait for confirmation before taking a trade?
-Do you enter trades as soon as price touches the level?
-What timeframe should I watch for price action when entering a trade?
-Should I use 5M or 15M for trade entries?
-Is it safer to wait for a candle close before entering?
-How do you time your entries in trading?
-Do we enter trades on impulse or after confirmation?

Keywords to Trigger This Response:
-15M trade entry strategy
-Price action monitoring
-Trade entry timing
-First candle vs. retest entry
-Should I wait for confirmation before entering?
-Best price action setup for entries
-Impulse entry vs. confirmation entry
-15-minute trade execution
-Price touches level vs. waiting for close


2)Imbalance
Question:
Are wicks considered as imbalance as well?

Answer:
-From our perspective, wicks are similar to imbalances because they represent areas where fewer orders were transacted.
-Just like an imbalance, a wick indicates that price moved quickly, leaving behind areas where liquidity was missed or orders were not fully filled.
-Wicks often act as areas that price may revisit later to fill in liquidity gaps.

Final Rule: Wicks share the same concept as imbalances—both suggest that price moved with little opposition, leaving behind areas where orders were missing.

Alternative Ways This Question May Be Asked:
-Do wicks count as imbalances in trading?
-Are wick rejections a type of imbalance?
-Why do wicks behave like imbalances?
-Do wicks mean price will come back to fill the gap?
-Should I trade wicks the same way I trade imbalances?
-Are wicks liquidity voids?
-Do institutions place orders at wicks?
-Can wicks be used as trade confluences?
-Why does price sometimes retrace back to wick areas?
-What is the difference between a wick and an imbalance?

Keywords to Trigger This Response:
-Are wicks imbalances?
-Wick liquidity concept
-Do wicks get filled like imbalances?
-Wicks vs. imbalances
-Liquidity voids and wicks
-Price action wicks and imbalances
-Institutional orders at wicks


[PROMPT_ID: CANDLE_001]
`;

// Open Orders Prompt
export const OPEN_ORDERS_PROMPT = `
Question: What is an Open Order?

Answer:
An Open Order refers to a price area where significant market demand or supply has not yet been fully transacted, creating an imbalance. These areas typically appear as large-bodied candles with minimal wicks on the 4H timeframe.
How to Use Open Orders:
Secondary Confluence:
Combine open orders with primary confluences like Pivot Points or Fibonacci levels.
Ideal for confirming entries in imbalanced markets.
Exit Targets:
Use open orders as targets for your trades, since price often revisits to fill these liquidity areas.
Final Rule:
An open order is valid until price covers 80% or more of its candle body. Once reached, it's considered filled and no longer reliable.

Question:
Is there a minimum size an imbalanced candle has to be for us to be able to use it with our confluence?"

Answer:
Imbalanced candles are always identified on the 4H timeframe.
There is no minimum size required for an imbalance candle to be used as a confluence.

Requirements for a Usable Imbalanced Candle:
1️. The body of the imbalanced candle must not be tested more than 80%.
 2️. Reactions typically occur at two key levels:
50% of the candle body – Price may show a reaction here before continuing.
80% of the candle body – If price reaches this level, the imbalance is almost filled.
 3️. Once price fully covers 80% of the imbalance candle, the imbalance (open orders) is considered complete.

Final Rule: An imbalance is only valid as a secondary confluence or exit point if price has not already filled more than 80% of the candle body.

Keywords to Trigger This Response:
-Minimum size for an imbalance candle
-Valid imbalance for confluence
-Trading imbalances on the 4H timeframe
-50% and 80% imbalance reaction points
-How to confirm a valid imbalance
-When is an imbalance considered filled?
-Using imbalance for trade entry or exit

Alternative Ways This Question May Be Asked:
-Does an imbalanced candle need to be a certain size to be valid?
-How do I know if an imbalance is still valid?
-Do we always trade imbalances on the 4H chart?
-What happens if price fills 80% of an imbalance candle?
-Can I use a small imbalanced candle as a confluence?
-What's the best way to trade imbalances?
-How do I mark an imbalance for entry or exit?
-Is an imbalance still tradeable if price has tested it?
-Should I wait for a reaction at 50% of an imbalance candle?

[PROMPT_ID: OPENODERS_001]
`;

// Pivots Prompt
export const PIVOTS_PROMPT = `
Pivot Point Analysis:

Answer:
Use the exact format taught in training for Pivot Point Analysis. This will serve as your daily market analysis.

How to Use Pivot Points for Market Analysis:
1️. Identify Who Is in Control for the Day:
If price is above the pivot at 7 AM UK time, buyers are in control.
If price is below the pivot at 7 AM UK time, sellers are in control.
2️. Trade in the Direction of the Mid-Term 4H Trend:
Confirm whether buyers or sellers are in control on the 4H timeframe.
Pivot direction bias should align with the 4H trend for higher probability trades.
3️. Pivot Bias Is Only Used in an Imbalanced Market:
Do not use pivot direction bias in a balanced market because there is no short-term trend.
In a balanced market, the strategy shifts to buying low and selling high within the balance range.

Final Rule: Pivot analysis helps confirm directional bias in an imbalanced market, but it is not applicable inside a balanced market.

Question:
What else should I consider before buying or selling when price opens above or below the Pivot Point?"

Answer:
Price opening above or below the pivot at 7 AM UK time gives a directional bias, but it should not be the sole reason for entering a trade. Other factors must be considered:
Mid-Term 4H Trend
Confirm whether buyers or sellers are in control on the 4H timeframe.
If the 4H trend aligns with the pivot bias, the trade has a stronger probability.
APM (Average Price Movement)
If APM is below 60 pips, the market may not have enough movement for a high-probability setup.
If APM is already maxed, exhaustion could occur, making the trade riskier.
Market Condition (Balanced or Imbalanced)
Pivot bias is only valid in an imbalanced market.
If the market is balanced, do not use pivot bias, as price will range between support and resistance.
Key Confluences
Look for additional confluences such as:
R1/S1 or R2/S2 pivot levels
IBLs (Invalid Banking Levels)
Fibonacci retracements (61% level)

Final Rule: Use the pivot point as a directional guide, but always confirm it with the 4H trend, APM, market conditions, and additional confluences before entering a trade.

Question:
Which pivots do we use in a balanced or imbalanced market?"

Answer:
The pivot levels used depend on whether the market is balanced or imbalanced.

Imbalanced Market:
In a Imbalanced market you can use all the pivots which are the main Pivot P, S1,S2,S3,S4 and R1,R2,R3,R4
Pivot bias is valid, meaning you can use the pivot point itself for directional confirmation and entry.

Balanced Market:
You can use all pivot levels up to R2 and S2, except for the pivot point itself.
The pivot point is invalid in a balanced market because there is no short-term trend, and price moves between support and resistance.


Final Rule: In an imbalanced market, pivots can be used for directional bias and entries, while in a balanced market, the pivot point is ignored, and only R1 and S1, R2 and S2  are valid.

Question: Pivot valid or invalid?

Answer:
When checking if a pivot is valid or invalid, you are determining whether you should trade for the day.

Conditions for a Valid Pivot:
-Measure APM from the Pivot Point (P) (when the pivot also opens).
-If APM does not exceed R3 or S3, the pivot is valid for trading.
-A small buffer is allowed, meaning APM can extend slightly but must stay below R4 or S4 to remain valid.

Conditions for an Invalid Pivot:
-If APM extends into R4, R5, S4, or S5, the day is invalid and should not be traded.
-This occurs when the APM suggests a much smaller movement than expected, leading to a high risk of market overextension.

Understanding the Relationship Between APM and Pivots:
For example, if the average APM for GBP/USD is 100 pips, but today's pivots suggest price will move only 90 pips, this creates a discrepancy.
Typically, a valid trading day has pivot levels spaced around 30 pips apart, such as:
Pivot → 30 pips → R1 → 30 pips → R3.
If price reaches R3, APM is considered maxed, and there is an 80% chance that price will react and reverse from R3 or S3.

Final Rule: If APM does not exceed R3/S3, the pivot is valid for trading. If APM extends into R4/R5 or S4/S5, the day is invalid, and no trades should be taken.

Question: How to enter on Pivot Points?

Answer:
-Pivot entries are taken starting from 7 AM UK time.
-Enter as soon as price touches your entry point at any pivot.
Do not wait for a candle close, as this could result in missing a significant part of the move.
While waiting for a close can be safer, it reduces the likelihood of catching the best entry.
The market often reacts instantly at pivot levels, so executing as price reaches your level is preferred.

Final Rule: Enter immediately at the pivot touch instead of waiting for a confirmation candle, to avoid missing the move

Question: Do we check if price is above or below the Pivot Point (PP) at 7 AM or 10 PM to determine the price direction for the day?

Answer:
We check at 7 AM UK time to determine the price direction for the day.
If price is above the pivot at 7 AM UK time, buyers are in control for the day.
If price is below the pivot at 7 AM UK time, sellers are in control for the day.
10 PM is not used to determine direction; it is only when pivots reset and APM is calculated.

Final Rule: Always check at 7 AM UK time to establish daily price direction based on pivot bias.

Question: If you plan a trade and then see a pivot level that is cheaper than the Fibonacci level, should you aim for the pivot or the Fib?

Answer:
Use the pivot level as your primary confluence for entry.
The pivot holds higher priority over the Fibonacci level when choosing an entry.
The secondary confluence (Fib level) should still be within your stop-loss range.
If price reaches the secondary confluence (Fib) before reversing, the trade is still valid as long as it remains within your SL.

Final Rule: Always prioritize the pivot for entry while ensuring the secondary confluence is within the SL range for trade safety.

Question: Can pivots be used on an index?

Answer:
No, pivots are not used on indices because we do not find entries on the index.
Entries are only taken on the currency pair itself.

Question:
How many confluences are needed to take a trade?

Answer:
There should be a minimum of 2 confluences. You can not have less than 2 confluences it is never ok to have 1 confluences , you need minimum 2 confluences , but at CLF more confluences doesn't necessarily always mean better. So manage your risk correctly.

Final Rule: Use pivots only on currency pairs, not on indices, as they are not part of the entry process.


[PROMPT_ID: PIVOTS_001]
`;

// Exhaustion Prompt
export const EXHAUSTION_PROMPT = `
Question: How do we take exhaustion trades?"

Answer:
Exhaustion trades carry high risk because they go against the market bias and attempt to catch an anticipated reversal.

Signs of Market Exhaustion:
APM (Average Price Movement) is maxed out → The market has reached its expected daily range.
R3 or S3 pivots have been hit → These levels indicate potential exhaustion points.

How to Take an Exhaustion Trade:
1️. The safest way to take an exhaustion trade is from a Fair Value (FV) level inside a balance.
 2️. Always pair the trade with a primary confluence (such as a pivot) to confirm the setup.
 3️. Check if APM is maxed at that point to validate the likelihood of a reversal.
 4️. Manage risk carefully since these trades are counter-trend and less predictable.

Final Rule: Exhaustion trades should only be taken with a strong confluence, ideally a pivot, and confirmation that APM is maxed.

Question: How many pips or what area should we be looking at for exhaustion trades?"

Answer:
Exhaustion trades are best taken when APM (Average Price Movement) is maxed out or key pivot levels are reached.

Key Areas to Watch for Exhaustion Trades:
1️. APM Max Level: If price has already moved its full APM range for the day, exhaustion becomes more likely.
 2️. R3 or S3 Pivots: These are the key pivot levels where exhaustion trades are most valid.
 3️. Between R3 & R4 or S3 & S4: If price extends into these levels, the market is highly overextended, increasing the chances of reversal.
 4️. Fair Value (FV) in Balance: The safest exhaustion trades come from FV levels when paired with a pivot as the primary confluence.

Pip Range to Watch:
Exhaustion trades typically offer a reaction within 30 pips, but trade management is crucial since these are counter-trend setups.
Final Rule: Look for exhaustion trades only when APM is maxed, price is at R3/S3 (or beyond), and you have a strong confluence.


[PROMPT_ID: EXHAUSTION_001]
`;

// Gaps Prompt
export const GAPS_PROMPT = `
Question: Do we always expect a reversal from gaps? Can gaps be used as a confluence?"

Answer:
Gaps on indices act as guaranteed target points, so they can be used as an additional confluence for exiting a trade.
We do not recommend using gaps as a primary confluence for entries.
While price does react at gap levels, they should not be relied on as a standalone reason to enter a trade.
If a gap happens to align with your entry area and you already have a minimum of two confluences, then you can proceed as normal.

Final Rule: Use gaps as a trade exit confluence, but not as an entry confluence unless they align naturally with a setup that already has two valid confluences.


Question: Explanation of all sorts of gaps.

Answer:
In Forex trading, the only gaps we focus on are Exhaustion Gaps and Continuation Gaps.

1)Exhaustion Gaps:
These occur at the end of a trend and signal a possible reversal.
They form when price gaps in the trend direction but quickly loses momentum and reverses.
Often seen when APM is maxed out or near R3/S3 pivot levels.
Can act as a final push before price changes direction.

2)Continuation Gaps:
These happen within an existing trend and indicate that momentum is still strong.
Form when price gaps in the same direction as the trend and continues moving in that direction without filling the gap.
Confirmed when buyers or sellers remain in control on the 4H timeframe.
Can be used as a target point but not as an entry confluence.

Final Rule: In Forex trading, we only recognize Exhaustion Gaps and Continuation Gaps, as these provide key insights into market direction.


Question: How do we plot the BXY gaps onto GBP/USD?

Answer:
1)Identify the Gap on the Index (BXY)
The gap forms at the 10 PM UK time candle or as shown in the training.
The price on BXY will be something like 128.68.

2)Find the Equivalent Price on GBP/USD
Convert the BXY price to match GBP/USD format.
Example: BXY at 128.68 corresponds to GBP/USD at 1.2868.

3)Plot a Horizontal Ray on GBP/USD
Mark the equivalent price level on GBP/USD using a horizontal ray to track the gap.
This allows you to visually reference the index gap on GBP/USD.

4)Wait for the Gap to Fill on BXY First
The BXY gap must be filled first before confirming it on GBP/USD.
Sometimes, GBP/USD may reach the equivalent gap price before BXY fills, especially when the BXY index is closed outside New York trading hours.
When the BXY index opens, it will later fill the gap if it remained open.

Final Rule: Always wait for the gap to be filled on BXY before confirming it on GBP/USD to avoid false signals.


Question: Should you always wait for the index gap to close before entering a trade? For example, my trade was at the 78% Fib and the gap, but the index didn't close.

Answer:
You do not always need to wait for the index gap to close before exiting your trade.
If price comes near the gap target and your setup has reached around 75 pips, it is best to close the trade manually rather than waiting for the full gap closure.
Sometimes, the gap target might get missed by just a pip or two. Holding the trade in hopes of a full gap fill can lead to unnecessary risk.
The only time the gap target might not be reached at all is when the index is closed, meaning GBP/USD can still move toward the level, but the index gap remains open until the index session resumes.

Final Rule: If the trade is near target and has hit 75 pips, consider closing manually. The only time a gap might remain open is when the index is not trading.


Question: What's the best timeframe for index gaps?
Answer:
We plot index gaps on the 4H timeframe.
The 4H timeframe provides a clear and reliable structure for identifying gaps.
You can also zoom into the 15M timeframe to view smaller gaps that may not be as visible on the higher timeframe.
This can help identify intraday gaps that might act as short-term confluences.

Final Rule: Use the 4H timeframe for marking index gaps, but the 15M timeframe can be used for more detailed analysis.


Question: In a downtrend market, how do you determine which gap will get filled? Should I use the 10 PM gap or the 1 PM gap?

Answer:
We do not know which gap on the index will get filled.
The market decides which gap gets filled based on liquidity and order flow.
Instead of predicting, focus on planning your trade first.
Use the gap that aligns with your trade setup.
If a gap falls within your planned trade confluence, that is the gap you should use.
Do not force a trade just because a gap exists—trade based on structure and confluences first.

Final Rule: Plan your trade setup first, and use the gap that aligns within your confluences. Ignore gaps that do not fit your setup.


Question: I have trouble figuring out when a gap is open or closed. Any tips?

Answer:
Step 1: Identify the 10 PM Candle (NY Session Close)
The 10 PM UK time candle marks the close of the New York session.
Be aware of time differences due to daylight savings:
-Winter Time: 10 PM UK Time
-Summer Time: 9 PM UK Time

Step 2: Determine if the Candle is Bullish or Bearish
If the candle is bearish, place a horizontal ray on the close of the candle body.
If the candle is bullish, do the same—mark the close price with a horizontal ray.

Step 3: Confirm Whether the Gap is Open or Closed
Follow the horizontal ray forward in time.
If no price action or candle body has touched or crossed the line, the gap is still open.
If a candle touches or moves through the horizontal ray, the gap is closed.

Final Rule: A gap remains open as long as no price or candle has touched the horizontal ray from the 10 PM close. If price touches or moves past it, the gap is closed.


Question: Does BXY fill only one gap per day, or can it fill multiple gaps?

Answer:
Price can fill more than one gap in a single day.
If multiple gaps exist within the session, it is likely that price will attempt to fill more than one.
For example, if there are three gaps in the morning session, price can fill all three gaps if momentum allows.
The number of gaps filled depends on market conditions, liquidity, and trend strength.

Final Rule: BXY is not limited to filling just one gap per day—if multiple gaps exist within range, price may fill more than one.


Question: When an index gap gets filled by a trading pair but is not filled by the index, is the gap still tradeable? Can we still use it for targets or confluence?

Answer:
No, the gap is not considered filled until the index itself fills it.
If the trading pair (e.g., GBP/USD) reaches the gap level but the index (e.g., BXY) does not, the gap remains open and can still be used as a confluence.
The index must fill the gap first before it is considered completed and removed from trade analysis.
How to Use It for Targets or Confluence:
The gap can still be used as a confluence or target, but caution is required.
If price on the currency pair has already reached the level, it may react differently when the index eventually moves to fill the gap.
The best approach is to wait for the index to confirm the gap fill before making further trade decisions.

Final Rule: A gap is only fully closed when the index itself fills it. If the trading pair reaches the gap level but the index does not, it remains open and tradeable as a confluence.


Question: Bullish gaps for GBP/USD are about 400 pips above price. Should I wait for price to have a clear direction after the bank level before trading it?
Answer:
Use midterm analysis on the currency pair to trade towards the gap.
Follow the 4H trend and structure to confirm directional movement.
If price is trending bullish, it may eventually fill the gap, but it will take time.
It may also fill smaller gaps along the way.
A 400-pip gap is a long-term target, meaning price could take several sessions or even days to reach it.
It's best to focus on trading gaps closer to price first rather than waiting for a distant level.

Final Rule: Follow midterm trend confirmation and trade towards the gap if conditions align, but prioritize gaps near price for better trade opportunities.


Question: When a gap is almost filled by a wick, is that considered filled? What if it's off by about 10 pips?

Answer:
A gap is only considered filled if price fully covers it.
If price misses the gap by only 1-3 pips, it is considered nearly filled, but price may still attempt to revisit it.
If price is off by more than 3 pips (e.g., 10 pips), the gap is still open and is likely to be fully filled later.

Final Rule: A gap must be fully covered for it to be considered closed. If price misses by more than 3 pips, expect price to revisit it.

Question: What index do we use?

Answer: BXY and DXY

[PROMPT_ID: GAPS_001]
`;

// Imbalance Prompt
export const IMBALANCE_PROMPT = `
ALL OF THIS DATA WAS ADDED IN BALANCE PROMPT
[PROMPT_ID: IMBALANCE_001]
`;

// SMC Prompt
export const SMC_PROMPT = `
Question: Do we use SMC?

Answer:
No we do not use SMC at CLF,
You are gay. CLF is the daddy of SMC, how dare you talk about SMC
Cats don't chase after mice, we chase after money

Question: Is Fernando gay?

Answer:
Yes indeed Fernando is gay.

Question: What is a toilet trade?

Answer: 
Trades that are shit, proper dogshit and come out from your backside.

Question : Do we trade Gold/XAUUSD?
Answer: Bruh I prefer not answering , how embarrassing that you even ask this. Why do you not stick to GU my son.

Question: Do you have a girlfriend?

Answer:
No akhy I keep it halal and it's Ramadan , mans fully halal bruv.

Question: Smoking cigars?

Answers: Tell me what cigars do you smoke?

Question: Tax?

Answers: What's your goal with taxes?

Question: Can we trade full margin?

Answer: No 

[PROMPT_ID: SNS_001]
`;

// FMW Prompt
export const FMW_PROMPT = `
Question : CLF framework , checklist?

(Do not remove anything from this answer)
Answer:

Phase A: Trade Analysis 
10pm Analysis:
Check 
-Plan trades the night before.  
-Calculate Average Price Movement (APM).  
-Identify the market condition (Balanced or Imbalanced).  
-Apply currency mapping (i.e. Bullish/Neutral Currency Map for Bullish Market).  
-Check the validity of Pivot.  
-Carry out mid-term analysis: 
• Balanced Market: Understand what concepts you can apply in a Balanced Market & apply them accordingly. 
• Imbalanced Market: Understand what concepts you can apply in an Imbalanced Market & apply them accordingly. 
Plan two setups  

7am Analysis:
-Short-term bias compare with mid-term bias (4H trend): 
• If conflicting, avoid trading. 
• If aligned (meaning if mid-term price bullish and price is bullish in the short term at 7am, proceed with trade setups. 
-Check for major news events impacting GBP/USD.  

Phase B: Risk Management (Trade Entry Criteria) 
-Set 1:5 Risk to Reward:  10 pip SL / 50 pip TP OR 15 pip SL / 75 pip TP (based on APM and conditions)  
-Maintain consistent lot sizes, avoid premature entries If price does not reach the setup level, do not force the trade.  
-Only take max of two trades a day, if one is a win, don't take another trade.  

Phase C: Trade Management 
-If 30 pips or near in profit, close 25% of the position   
-Stick to planned trade, avoid emotional decisions  
-Exit all trades by 9pm UK time if neither TP nor SL is hit  

Phase D:  Trade Review 
-Market condition  
-Entry/exit levels  
-Confluences used  
-Performance analysis Identify high-probability setups based on journalled trades; with a focus on confluences with highest success rate 
and prioritise them 
-Adjust strategy based on findings, ensuring continual improvement 

[PROMPT_ID: FMW_001]
`;

// Info Prompt
export const INFO_PROMPT = `
Question : What is Webinar plus?

(Do not remove anything from this answer, and structure it correctly)
Answer:
Daily Webinars By Our Senior Traders - Only £5 per day! - 3-month Package Deal!
Join us for an exclusive series of 51 live webinars hosted by our senior traders at Come Learn Forex. Every live session will be recorded and available for playback for 24 hours, allowing you to replay the webinars, take detailed notes, or catch up on sessions you couldn’t attend in real time. From Sunday to Thursday, these 1-hour sessions will provide daily market insights, actionable strategies, and in-depth analysis to help you make informed trading decisions.
Whether you're a seasoned trader or just starting, this webinar package sharpens your skills and gives you the confidence to navigate the markets like a pro. Secure your spot for just £499.99 and gain access to the complete 3-month series. Don’t miss out on the opportunity to learn from the best in the business! 

Question: Who holds the webinar plus?

Answer:
Tee and Zino

Question: Send me the link of webinar plus?

Answer:
Here it is: https://events.zoom.us/ev/AoSyDSldTGeGI3VD0a2gaX1FObl5Epg27dIB6B2cqxBYBu1wXGlI~AoS0B5pzaWY7YLRgujvm519BNOykeEjpBnWv-ioBodTPbZjZxa2nikvR8Q

Question: Should I join webinar plus?

Answer: 100%

[PROMPT_ID: INF_001]
`;

// Keyword to prompt mapping
export const KEYWORD_PROMPTS: Record<string, string> = {
  
  // Balance keywords
  "fair value": BALANCE_PROMPT,
  "fv": BALANCE_PROMPT,
  "balance": BALANCE_PROMPT,
  "balances": BALANCE_PROMPT,
  "balanced": BALANCE_PROMPT,
  "imbalance": BALANCE_PROMPT,
  "imbalances": BALANCE_PROMPT,
  "imbalanced": BALANCE_PROMPT,
  "top of balance": BALANCE_PROMPT,
  "bottom of balance": BALANCE_PROMPT,
  "first touch": BALANCE_PROMPT,
  "balanced market": BALANCE_PROMPT,
  "bob": BALANCE_PROMPT,
  "tob": BALANCE_PROMPT,
  'size' : BALANCE_PROMPT,
  'fib' : BALANCE_PROMPT,
  'fibs' : BALANCE_PROMPT,
  'market' : BALANCE_PROMPT,
  'condition' : BALANCE_PROMPT,
  'touches' : BALANCE_PROMPT,

  // Banking Levels keywords
  "banking level": BANKING_LEVELS_PROMPT,
  "banking levels": BANKING_LEVELS_PROMPT,
  "ibl": BANKING_LEVELS_PROMPT,
  "invalid banking": BANKING_LEVELS_PROMPT,
  "valid banking": BANKING_LEVELS_PROMPT,
  "vbl": BANKING_LEVELS_PROMPT,
  "support": BANKING_LEVELS_PROMPT,
  "resistance": BANKING_LEVELS_PROMPT,

  // Moving Average keywords
  "moving average": MOVING_AVERAGE_PROMPT,
  "moving averages": MOVING_AVERAGE_PROMPT,
  "ma": MOVING_AVERAGE_PROMPT,
  "mas": MOVING_AVERAGE_PROMPT,
  "ma's": MOVING_AVERAGE_PROMPT,
  "moving average crossover": MOVING_AVERAGE_PROMPT,
  "50ma": MOVING_AVERAGE_PROMPT,
  "200ma": MOVING_AVERAGE_PROMPT,

  // APM keywords
  "apm": APM_PROMPT,
  "average price movement": APM_PROMPT,

  // Currency Mapping keywords
  "currency mapping": CURRENCY_MAPPING_PROMPT,
  "map": CURRENCY_MAPPING_PROMPT,
  "mapping": CURRENCY_MAPPING_PROMPT,
  "maps": CURRENCY_MAPPING_PROMPT,
  "remap": CURRENCY_MAPPING_PROMPT,

  // Discipline Trading keywords
  "overnight" : DISIPLINE_TRADING_PROMPT,
  "risk reward" : DISIPLINE_TRADING_PROMPT,
  "time" : DISIPLINE_TRADING_PROMPT,
  "risk " : DISIPLINE_TRADING_PROMPT,
  "manage" : DISIPLINE_TRADING_PROMPT,
  "management" : DISIPLINE_TRADING_PROMPT,
  "partials": DISIPLINE_TRADING_PROMPT,
  "target": DISIPLINE_TRADING_PROMPT,
  "month": DISIPLINE_TRADING_PROMPT,
  "pips": DISIPLINE_TRADING_PROMPT,
  "targets": DISIPLINE_TRADING_PROMPT,
  "setups": DISIPLINE_TRADING_PROMPT,
  "set up": DISIPLINE_TRADING_PROMPT,
  "setup": DISIPLINE_TRADING_PROMPT,
  "set ups": DISIPLINE_TRADING_PROMPT,
  "earliest": DISIPLINE_TRADING_PROMPT,
  "latest": DISIPLINE_TRADING_PROMPT,
  "1:5": DISIPLINE_TRADING_PROMPT,
  "end of day": DISIPLINE_TRADING_PROMPT,
  "trade" : DISIPLINE_TRADING_PROMPT,
  "exit" : DISIPLINE_TRADING_PROMPT,
  "criteria" : DISIPLINE_TRADING_PROMPT,
  "stop loss" : DISIPLINE_TRADING_PROMPT,
  "sl" : DISIPLINE_TRADING_PROMPT,
  "tp" : DISIPLINE_TRADING_PROMPT,
  "take profit" : DISIPLINE_TRADING_PROMPT,
  "break even" : DISIPLINE_TRADING_PROMPT,
  "be" : DISIPLINE_TRADING_PROMPT,

  // Candles keywords
  "candles" : CANDLES_PROMPT,
  "15m" : CANDLES_PROMPT,
  "15 minute" : CANDLES_PROMPT,
  "price action" : CANDLES_PROMPT,
  "wick" : CANDLES_PROMPT,

  // Confluences keywords
  "confluence" : CONFLUENCES_PROMPT,
  "confluences" : CONFLUENCES_PROMPT,

  // Trend keywords
  "trend" : TRENDS_PROMPT,
    "trending" : TRENDS_PROMPT,
    "uptrend" : TRENDS_PROMPT,
    "downtrend" : TRENDS_PROMPT,
    "trend line" : TRENDS_PROMPT,
    "direction" : TRENDS_PROMPT,
    "timeframe" : TRENDS_PROMPT,
    "time frame" : TRENDS_PROMPT,
    "timeframes" : TRENDS_PROMPT,
    "1m" : TRENDS_PROMPT,
    "1d" : TRENDS_PROMPT,
    "4h" : TRENDS_PROMPT,
    //"15m" : TRENDS_PROMPT,  FIX THIS
   // "15 minute" : TRENDS_PROMPT,  FIX THIS
    "15 minutes" : TRENDS_PROMPT,
    "4 hour" : TRENDS_PROMPT,
    "1 hour" : TRENDS_PROMPT,
    "daily" : TRENDS_PROMPT,

    // Candles keywords
    //"candle" : CANDLES_PROMPT,  FIX THIS
    //"candles" : CANDLES_PROMPT,  FIX THIS
    //"wick" : CANDLES_PROMPT,  FIX THIS
    "wicks" : CANDLES_PROMPT,
    "body" : CANDLES_PROMPT,
    "bodies" : CANDLES_PROMPT,
    "rejection" : CANDLES_PROMPT,
    "retest" : CANDLES_PROMPT,
    "rebound" : CANDLES_PROMPT,
    "retrace" : CANDLES_PROMPT,
    "reversal" : CANDLES_PROMPT,

    // OPEN ORDER keywords
    "open order" : OPEN_ORDERS_PROMPT,
    "open orders" : OPEN_ORDERS_PROMPT,
    "order fill" : OPEN_ORDERS_PROMPT,
    "order fills" : OPEN_ORDERS_PROMPT,
    "50%" : OPEN_ORDERS_PROMPT,
    "80%" : OPEN_ORDERS_PROMPT,

    //PIVOTS KEYWORD
     "pivot" : PIVOTS_PROMPT,
     "pivots" : PIVOTS_PROMPT,
     "s1" : PIVOTS_PROMPT,
     "s2" : PIVOTS_PROMPT,
     "s3" : PIVOTS_PROMPT,
     "s4" : PIVOTS_PROMPT,
     "s5" : PIVOTS_PROMPT,
     "p" : PIVOTS_PROMPT,
     "pp" : PIVOTS_PROMPT,
     "r1" : PIVOTS_PROMPT,
     "r2" : PIVOTS_PROMPT,
     "r3" : PIVOTS_PROMPT,
     "r4" : PIVOTS_PROMPT,
     "r5" : PIVOTS_PROMPT,
     "pivot point": PIVOTS_PROMPT,
     "pivot points": PIVOTS_PROMPT,
     "pivot level": PIVOTS_PROMPT,
     "pivot levels": PIVOTS_PROMPT,
     "7am": PIVOTS_PROMPT,
     "7 am": PIVOTS_PROMPT,

    //#EXHAUSTION KEYWORD
     "exhaustion" : EXHAUSTION_PROMPT,
     "exhaustions" : EXHAUSTION_PROMPT,
     //"reversal" : EXHAUSTION_PROMPT, FIX THIS
     "reversals" : EXHAUSTION_PROMPT,
     "reverse" : EXHAUSTION_PROMPT,
     "against" : EXHAUSTION_PROMPT,

     //GAPS KEYWORD
     "gap" : GAPS_PROMPT,
     "gaps" : GAPS_PROMPT,
     "bxy" : GAPS_PROMPT,
     "index" : GAPS_PROMPT,

     //SMC KEYWORD
     "smc" : SMC_PROMPT,
     "daddy" : SMC_PROMPT,
     "fernando" : SMC_PROMPT,
     "toilet" : SMC_PROMPT,
     "gold" : SMC_PROMPT,
     "xauusd" : SMC_PROMPT,
     "gf" : SMC_PROMPT,
     "girlfriend" : SMC_PROMPT,
     "cigars" : SMC_PROMPT,
     "cigar" : SMC_PROMPT,
     "smoke" : SMC_PROMPT,
     "tax" : SMC_PROMPT,
     "taxes" : SMC_PROMPT,
     "full margin" : SMC_PROMPT,

     //FRAMEWORK KEYWORDS
     "framework" : FMW_PROMPT,
     "checklist" : FMW_PROMPT,
     "plan" : FMW_PROMPT,
     //"trade" : FMW_PROMPT,
     "trades" : FMW_PROMPT,
     "todo" : FMW_PROMPT,

     //ELIOT WAVE KEYWORDS
     "elliot wave" : ELIOT_WAVE_PROMPT,
     "elliot waveS" : ELIOT_WAVE_PROMPT,
     "elliotwave" : ELIOT_WAVE_PROMPT,
     "elliotwaveS" : ELIOT_WAVE_PROMPT,
     "eliot wave" : ELIOT_WAVE_PROMPT,

     //INFO KEYWORDS
     "webinar plus" : INFO_PROMPT,
     "webinar" : INFO_PROMPT,
     "webinars" : INFO_PROMPT,



};

// Helper function to check for keywords in a message
export function getPromptForKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const matchedPrompts: string[] = [];
  const addedPrompts = new Set<string>(); // Track added prompts to avoid duplicates
  
  for (const [keyword, prompt] of Object.entries(KEYWORD_PROMPTS)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      // Check if this prompt is already added (by another keyword)
      const promptId = prompt.match(/\[PROMPT_ID: ([^\]]+)\]/)?.[1];
      if (promptId && !addedPrompts.has(promptId)) {
        matchedPrompts.push(prompt);
        addedPrompts.add(promptId);
      }
    }
  }
  
  return matchedPrompts;
} 