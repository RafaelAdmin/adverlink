'use client'

import { CurrencyCode } from '@/lib/currency'
import CurrencySelector from '../CurrencySelector'
import FilterDropdown from '../FilterDropdown'
import StatusToast from './StatusToast'
import CreatorRequestCard from './CreatorRequestCard'
import CampaignCard from './CampaignCard'
import { CAMPAIGN_SORT_OPTIONS, COUNTRY_FILTER_OPTIONS, SOCIAL_FILTER_OPTIONS } from './constants'

export default function CreatorView({
  toast,
  creatorTab,
  setCreatorTab,
  search,
  setSearch,
  loading,
  filteredCreatorRequests,
  creatorChannelMap,
  userId,
  onUpdateRequest,
  showToast,
  showCampaignFilters,
  setShowCampaignFilters,
  campaignSortBy,
  setCampaignSortBy,
  displayCurrency,
  setDisplayCurrency,
  filterCountry,
  setFilterCountry,
  filterSocialNet,
  setFilterSocialNet,
  minBudget,
  setMinBudget,
  maxBudget,
  setMaxBudget,
  minRequiredSubs,
  setMinRequiredSubs,
  maxRequiredSubs,
  setMaxRequiredSubs,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  filteredCampaigns,
  userChannels,
  expandedCampaignId,
  setExpandedCampaignId,
}: {
  toast: string | null
  creatorTab: 'mine' | 'campaigns'
  setCreatorTab: (tab: 'mine' | 'campaigns') => void
  search: string
  setSearch: (v: string) => void
  loading: boolean
  filteredCreatorRequests: any[]
  creatorChannelMap: Record<string, any>
  userId: string
  onUpdateRequest: (id: string, patch: Record<string, unknown>) => void
  showToast: () => void
  showCampaignFilters: boolean
  setShowCampaignFilters: (v: boolean) => void
  campaignSortBy: string
  setCampaignSortBy: (v: string) => void
  displayCurrency: CurrencyCode
  setDisplayCurrency: (v: CurrencyCode) => void
  filterCountry: string
  setFilterCountry: (v: string) => void
  filterSocialNet: string
  setFilterSocialNet: (v: string) => void
  minBudget: number
  setMinBudget: (v: number) => void
  maxBudget: number
  setMaxBudget: (v: number) => void
  minRequiredSubs: number
  setMinRequiredSubs: (v: number) => void
  maxRequiredSubs: number
  setMaxRequiredSubs: (v: number) => void
  dateFrom: string
  setDateFrom: (v: string) => void
  dateTo: string
  setDateTo: (v: string) => void
  filteredCampaigns: any[]
  userChannels: any[]
  expandedCampaignId: string | null
  setExpandedCampaignId: (v: string | null) => void
}) {
  return (
    <div>
      <StatusToast message={toast} />
      <h1 className="text-2xl font-bold text-white mb-2">Маркетплейс</h1>
      <p className="text-white/50 mb-6">Входящие запросы и кампании рекламодателей</p>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setCreatorTab('mine')} className={`rounded-full px-4 py-2 text-sm transition ${creatorTab === 'mine' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Мои запросы
        </button>
        <button onClick={() => setCreatorTab('campaigns')} className={`rounded-full px-4 py-2 text-sm transition ${creatorTab === 'campaigns' ? 'tab-pill-active' : 'border border-white/20 text-white/70'}`}>
          Запросы рекламодателей
        </button>
      </div>

      <input
        placeholder={creatorTab === 'mine' ? 'Поиск по имени, контакту или сообщению...' : 'Поиск по названию, категории или описанию...'}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3 text-white placeholder-white/30 outline-none focus-accent transition mb-4"
        style={{ display: creatorTab === 'campaigns' ? 'none' : 'block' }}
      />

      {creatorTab === 'mine' && (
        loading ? (
          <div className="text-white/50 text-center py-24">Загрузка...</div>
        ) : filteredCreatorRequests.length === 0 ? (
          <div className="text-center py-24">
            <i className="ti ti-clipboard-list" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
            <div className="text-white font-medium mb-2">Запросов не найдено</div>
            <div className="text-white/40 text-sm">Пока нет запросов на ваши каналы</div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {filteredCreatorRequests.map((req) => (
              <CreatorRequestCard
                key={req.id}
                request={req}
                channelMap={creatorChannelMap}
                userId={userId}
                onUpdate={(id, patch) => {
                  onUpdateRequest(id, patch)
                  showToast()
                }}
                linkToDeal
              />
            ))}
          </div>
        )
      )}

      {creatorTab === 'campaigns' && (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              placeholder="Поиск по названию, категории или описанию..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: '200px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '10px 16px',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowCampaignFilters(!showCampaignFilters)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '10px',
                border: showCampaignFilters
                  ? '1px solid var(--accent-primary, #9333ea)'
                  : '1px solid rgba(255,255,255,0.15)',
                background: showCampaignFilters
                  ? 'color-mix(in srgb, var(--accent-primary, #9333ea) 15%, transparent)'
                  : 'rgba(255,255,255,0.08)',
                color: showCampaignFilters ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <i className="ti ti-adjustments-horizontal" style={{ fontSize: '14px' }} />
              Фильтры {showCampaignFilters ? '▲' : '▼'}
            </button>
            <FilterDropdown
              value={campaignSortBy}
              onChange={setCampaignSortBy}
              options={CAMPAIGN_SORT_OPTIONS}
              size="sm"
              minWidth={180}
            />
            <CurrencySelector value={displayCurrency} onChange={setDisplayCurrency} size="sm" />
          </div>

          {showCampaignFilters && (
            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Страна</span>
                  <FilterDropdown
                    value={filterCountry}
                    onChange={setFilterCountry}
                    options={COUNTRY_FILTER_OPTIONS}
                    size="sm"
                    minWidth={200}
                    fullWidth
                  />
                </div>

                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Соцсеть</span>
                  <FilterDropdown
                    value={filterSocialNet}
                    onChange={setFilterSocialNet}
                    options={SOCIAL_FILTER_OPTIONS}
                    size="sm"
                    minWidth={200}
                    fullWidth
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Бюджет (AMD)</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                      {minBudget.toLocaleString()} — {maxBudget >= 10000000 ? '10M+' : maxBudget.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                    <input type="range" min={0} max={10000000} step={10000} value={minBudget}
                      onChange={(e) => setMinBudget(Math.min(Number(e.target.value), maxBudget - 10000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                    <input type="range" min={0} max={10000000} step={10000} value={maxBudget}
                      onChange={(e) => setMaxBudget(Math.max(Number(e.target.value), minBudget + 10000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Мин. подписчиков</span>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>
                      {minRequiredSubs.toLocaleString()} — {maxRequiredSubs >= 1000000 ? '1M+' : maxRequiredSubs.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center' }}>
                    <input type="range" min={0} max={1000000} step={1000} value={minRequiredSubs}
                      onChange={(e) => setMinRequiredSubs(Math.min(Number(e.target.value), maxRequiredSubs - 1000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 1 }} />
                    <input type="range" min={0} max={1000000} step={1000} value={maxRequiredSubs}
                      onChange={(e) => setMaxRequiredSubs(Math.max(Number(e.target.value), minRequiredSubs + 1000))}
                      style={{ position: 'absolute', width: '100%', accentColor: 'var(--accent-primary, #9333ea)', zIndex: 2, background: 'transparent' }} />
                  </div>
                </div>

                <div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '8px' }}>Дата размещения</span>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>—</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        color: 'white',
                        fontSize: '12px',
                        outline: 'none',
                        colorScheme: 'dark',
                      }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMinBudget(0)
                    setMaxBudget(10000000)
                    setMinRequiredSubs(0)
                    setMaxRequiredSubs(1000000)
                    setDateFrom('')
                    setDateTo('')
                    setFilterCountry('all')
                    setFilterSocialNet('all')
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '6px 14px',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Сбросить фильтры
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-white/50 text-center py-24">Загрузка...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-24">
              <i className="ti ti-speakerphone" style={{ fontSize: '48px', color: 'rgba(255,255,255,0.25)' }} />
              <div className="text-white font-medium mb-2">Кампаний не найдено</div>
              <div className="text-white/40 text-sm">Попробуй изменить фильтры</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  userChannels={userChannels}
                  expanded={expandedCampaignId === campaign.id}
                  onToggle={() => setExpandedCampaignId(expandedCampaignId === campaign.id ? null : campaign.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
