#!/usr/bin/env python3
"""
快速测试脚本：验证AKShare能否获取各个ETF数据
"""

import akshare as ak
from datetime import datetime, timedelta

# 测试 ETF 列表（选择几个代表性的）
TEST_ETFS = {
    '512050': 'A500ETF',
    '513130': '恒生科技ETF',
    '159919': '沪深300ETF',
    '512690': '酒ETF',
    '515790': '光伏ETF',
}

def test_single_etf(symbol, name):
    """测试单个 ETF 数据获取"""
    try:
        print(f"\n{'='*60}")
        print(f"测试: {name} ({symbol})")
        print(f"{'='*60}")
        
        # 计算日期范围
        end_date = datetime.now().date().strftime('%Y%m%d')
        start_date = (datetime.now() - timedelta(days=30)).date().strftime('%Y%m%d')
        
        print(f"日期范围: {start_date} - {end_date}")
        print("正在获取数据...")
        
        # 获取数据
        df = ak.stock_zh_a_hist(
            symbol=symbol,
            period='daily',
            start_date=start_date,
            end_date=end_date,
            adjust='qfq'
        )
        
        if df is not None and len(df) > 0:
            print(f"✓ 成功！获取了 {len(df)} 条数据")
            print(f"\n数据示例（前 5 行）:")
            print(df.head())
            print(f"\n数据列: {list(df.columns)}")
            return True
        else:
            print(f"✗ 失败：没有返回数据")
            return False
            
    except Exception as e:
        print(f"✗ 异常: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """运行所有测试"""
    print("\n")
    print("╔" + "="*58 + "╗")
    print("║" + " "*58 + "║")
    print("║" + "  AKShare ETF 数据获取测试".center(58) + "║")
    print("║" + " "*58 + "║")
    print("╚" + "="*58 + "╝")
    
    results = {}
    
    for symbol, name in TEST_ETFS.items():
        success = test_single_etf(symbol, name)
        results[name] = success
    
    # 打印总结
    print(f"\n{'='*60}")
    print("测试总结")
    print(f"{'='*60}")
    
    success_count = sum(1 for v in results.values() if v)
    total_count = len(results)
    
    for name, success in results.items():
        status = "✓ 成功" if success else "✗ 失败"
        print(f"{status}: {name}")
    
    print(f"\n总计: {success_count}/{total_count} 个 ETF 可以获取数据")
    
    if success_count == total_count:
        print("\n🎉 所有 ETF 都可以成功获取数据！")
        print("你可以放心使用 AKShare 库。")
    else:
        print("\n⚠️  部分 ETF 无法获取数据，可能原因：")
        print("  1. 代码错误")
        print("  2. 该 ETF 不支持前复权")
        print("  3. 网络连接问题")
        print("  4. AKShare 版本不兼容")

if __name__ == '__main__':
    # 首先检查 AKShare 是否安装
    try:
        print(f"AKShare 版本: {ak.__version__}")
    except:
        print("错误: 未安装 AKShare")
        print("请先运行: pip install akshare")
        exit(1)
    
    main()
