#!/usr/bin/env python3
"""
ETF K线数据获取脚本
使用AKShare库获取指定ETF的历史K线数据
"""

import akshare as ak
import pandas as pd
from datetime import datetime, timedelta
import sys

# ETF列表：名称 -> 代码
ETF_LIST = {
    'A500ETF': '512050',
    '恒生科技ETF': '513130',
    '恒生红利低波': '159545',
    '沪深300ETF': '159919',
    '中证500ETF': '159922',
    '有色金属ETF': '512400',
    '酒ETF': '512690',
    '红利低波ETF': '512890',
    '纳指ETF': '513100',
    '光伏ETF': '515790',
    '电池ETF': '561910',
    '科创50ETF': '588000',
    '华夏磐泰LOF': '160323',
    '标普ETF': '513650',
    '现金流': '159399',
    '日经225etf': '513000',
    '现金流DC': '159235',
}

def fetch_etf_kline_data(symbol, days=30):
    """
    获取ETF的K线数据
    
    Args:
        symbol (str): ETF代码
        days (int): 获取最近多少天的数据，默认30天
    
    Returns:
        pd.DataFrame: 包含K线数据的DataFrame，如果失败返回None
    """
    try:
        # 计算日期范围
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days)
        
        # 格式化日期为 YYYYMMDD
        start_date_str = start_date.strftime('%Y%m%d')
        end_date_str = end_date.strftime('%Y%m%d')
        
        print(f"正在获取 {symbol} 的K线数据 ({start_date_str} - {end_date_str})...")
        
        # 使用 stock_zh_a_hist 函数获取A股数据（包括ETF）
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period='daily',
            start_date=start_date_str,
            end_date=end_date_str,
            adjust='qfq'  # 前复权
        )
        
        if df is not None and len(df) > 0:
            print(f"✓ 成功获取 {symbol}，共 {len(df)} 条记录")
            return df
        else:
            print(f"✗ 获取 {symbol} 失败：没有数据")
            return None
            
    except Exception as e:
        print(f"✗ 获取 {symbol} 异常：{str(e)}")
        return None

def fetch_all_etf_data(days=30):
    """
    获取所有ETF的K线数据
    
    Args:
        days (int): 获取最近多少天的数据
    
    Returns:
        dict: {etf_code: DataFrame}
    """
    results = {}
    
    print("=" * 60)
    print(f"开始获取 {len(ETF_LIST)} 个ETF的K线数据...")
    print("=" * 60)
    
    for etf_name, etf_code in ETF_LIST.items():
        df = fetch_etf_kline_data(etf_code, days)
        if df is not None:
            results[etf_code] = {
                'name': etf_name,
                'data': df
            }
    
    print("=" * 60)
    print(f"完成！成功获取 {len(results)} 个ETF的数据")
    print("=" * 60)
    
    return results

def save_to_csv(data, output_dir='./etf_data'):
    """
    将K线数据保存为CSV文件
    
    Args:
        data (dict): {etf_code: {'name': str, 'data': DataFrame}}
        output_dir (str): 输出目录
    """
    import os
    
    # 创建输出目录
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    for etf_code, etf_info in data.items():
        filename = f"{output_dir}/{etf_code}_{etf_info['name']}.csv"
        etf_info['data'].to_csv(filename, index=False, encoding='utf-8-sig')
        print(f"已保存: {filename}")

def print_sample_data(data, sample_rows=5):
    """
    打印示例数据
    """
    for etf_code, etf_info in list(data.items())[:3]:  # 只打印前3个
        print(f"\n{etf_info['name']} ({etf_code}) - 最近 {sample_rows} 条数据：")
        print(etf_info['data'].head(sample_rows))

if __name__ == '__main__':
    # 获取数据
    etf_data = fetch_all_etf_data(days=30)
    
    # 打印示例数据
    if etf_data:
        print_sample_data(etf_data)
    
    # 可选：保存为CSV
    # save_to_csv(etf_data)
