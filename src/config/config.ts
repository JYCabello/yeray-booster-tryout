import { Booster } from '@boostercloud/framework-core'
import { BoosterConfig } from '@boostercloud/framework-types'

Booster.configure('local', (config: BoosterConfig): void => {
  config.appName = 'yeray-booster-tryout'
  config.providerPackage = '@boostercloud/framework-provider-local'
})

Booster.configure('production', (config: BoosterConfig): void => {
  config.appName = 'yeray-booster-tryout'
  config.providerPackage = '@boostercloud/framework-provider-aws'
})
Booster.configure('aws', (config: BoosterConfig): void => {
  config.appName = 'yeray-booster-tryout'
  config.providerPackage = '@boostercloud/framework-provider-aws'
})
Booster.configure('azure', (config: BoosterConfig): void => {
  config.appName = 'yeray-booster-tryout'
  config.providerPackage = '@boostercloud/framework-provider-azure'
})
