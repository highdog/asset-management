/**
 * Mapping of asset names to Eastmoney Securities IDs (secid)
 * This is a temporary mapping. Once "东财证券ID" field is added to Vika assets table, this can be removed.
 */
export const secidMapping: { [key: string]: string } = {
  'A500ETF基金': '1.512050',
  '恒生科技ETF': '1.513130',
  '恒生红利低波': '0.159545',
  '沪深300ETF': '0.159919',
  '中证500ETF': '0.159922',
  '有色金属ETF': '1.512400',
  '酒ETF': '1.512690',
  '红利低波ETF': '1.512890',
  '纳指ETF': '1.513100',
  '光伏ETF': '1.515790',
  '电池ETF': '1.561910',
  '科创50ETF': '1.588000',
  '华夏磐泰LOF': '0.160323',
  '标普ETF': '1.513650',
  '现金流': '0.159399',
  '日经225etf': '1.513000',
  '现金流DC': '0.159235',
  '工银黄金': '1.518660',
};
